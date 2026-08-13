#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

type Attributes = Record<string, string>;

export type Diagnostic = {
  code: string;
  message: string;
  line: number | null;
  content: string | null;
};

export type Diagnostics = {
  errors: Diagnostic[];
  warnings: Diagnostic[];
};

type Color = { red: number; green: number; blue: number };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ERROR_CODE_CATALOG_PATH = path.resolve(__dirname, "..", "references", "validator-error-codes.yaml");
const DOT_FENCE_RE = /^```(?:dot|graphviz)\s*$/;
const STYLE_SPLIT_RE = /\s*,\s*/;
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

let errorCatalogCache = null;
let dotBinaryAvailableCache = null;

export function loadErrorCatalog() {
  if (errorCatalogCache !== null) {
    return errorCatalogCache;
  }
  const lines = fs.readFileSync(ERROR_CODE_CATALOG_PATH, "utf8").split(/\r?\n/);
  const catalog = {};
  let currentCode = null;
  for (const line of lines) {
    const codeMatch = line.match(/^([A-Z]\d{3}):\s*$/);
    if (codeMatch) {
      currentCode = codeMatch[1];
      catalog[currentCode] = {};
      continue;
    }
    const messageMatch = line.match(/^\s+message:\s*(.+?)\s*$/);
    if (messageMatch && currentCode !== null) {
      const raw = messageMatch[1];
      let message = raw;
      try {
        message = JSON.parse(raw);
      } catch {
        message = raw.replace(/^["']|["']$/g, "");
      }
      catalog[currentCode].message = message;
    }
  }
  errorCatalogCache = catalog;
  return catalog;
}

export function errorMessage(code, params = {}) {
  const entry = loadErrorCatalog()[code];
  if (!entry || typeof entry.message !== "string") {
    throw new Error(`missing error catalog entry for ${code}`);
  }
  return entry.message.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function diagnostic(code, line = null, content = null, params = {}) {
  return {
    code,
    message: errorMessage(code, params),
    line,
    content: content || null,
  };
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/^"(.*)"$/s, "$1");
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function parseAttributes(raw: string): Attributes {
  const attrs: Attributes = {};
  const matches = raw.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("(?:[^"\\]|\\.)*"|[^,\]\n;]+)/g);
  for (const match of matches) {
    attrs[match[1]] = match[2].trim().replace(/^"(.*)"$/s, "$1");
  }
  return attrs;
}

function lineNumberForRegex(lines, regex, lineOffset) {
  for (let idx = 0; idx < lines.length; idx += 1) {
    if (regex.test(lines[idx])) {
      return lineOffset + idx + 1;
    }
  }
  return lineOffset + 1;
}

function extractDefaultStatement(dotText, keyword) {
  const regex = new RegExp(`(?:^|\\n)\\s*${keyword}\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = dotText.match(regex);
  if (!match) {
    return null;
  }
  return {
    raw: match[0],
    attrs: parseAttributes(match[1]),
  };
}

function extractClusterBlocks(dotText) {
  const blocks = [];
  const regex = /subgraph\s+(cluster_[A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
  let match;
  while ((match = regex.exec(dotText)) !== null) {
    blocks.push({
      id: match[1],
      raw: match[0],
      attrs: parseAttributes(match[2]),
    });
  }
  return blocks;
}

function styleTokens(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value.split(STYLE_SPLIT_RE).map((item) => item.trim()).filter(Boolean);
}

function isTransparentColor(value) {
  const color = normalizeColor(value);
  return color === "transparent" || color === "none";
}

function hasExplicitColor(value) {
  const color = normalizeColor(value);
  return color !== null && color !== "" && !isTransparentColor(color);
}

function parseHexColor(value: unknown): Color | null {
  const normalized = normalizeColor(value);
  if (normalized == null || !HEX_COLOR_RE.test(normalized)) {
    return null;
  }
  const hex = normalized.slice(1);
  const expanded = hex.length === 3 ? hex.split("").map((part) => `${part}${part}`).join("") : hex;
  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function relativeLuminance(color: Color): number {
  const channel = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
}

function contrastRatio(foreground: unknown, background: unknown): number | null {
  const foregroundColor = parseHexColor(foreground);
  const backgroundColor = parseHexColor(background);
  if (foregroundColor == null || backgroundColor == null) {
    return null;
  }
  const foregroundLuminance = relativeLuminance(foregroundColor);
  const backgroundLuminance = relativeLuminance(backgroundColor);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractNodeStatements(dotText: string): Array<{ id: string; attrs: Attributes; raw: string }> {
  const nodes: Array<{ id: string; attrs: Attributes; raw: string }> = [];
  const regex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\[([^\]]*)\]\s*;?\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(dotText)) !== null) {
    if (["graph", "node", "edge"].includes(match[1])) {
      continue;
    }
    nodes.push({ id: match[1], attrs: parseAttributes(match[2]), raw: match[0] });
  }
  return nodes;
}

function hasDotBinary() {
  if (dotBinaryAvailableCache !== null) {
    return dotBinaryAvailableCache;
  }
  const probe = spawnSync("dot", ["-V"], { encoding: "utf8", timeout: 1500 });
  dotBinaryAvailableCache = probe.status === 0;
  return dotBinaryAvailableCache;
}

function smokeRender(dotText) {
  if (!hasDotBinary()) {
    return { error: diagnostic("D091") };
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-dot-render-"));
  const sourcePath = path.join(tempDir, "diagram.dot");
  const outputPath = path.join(tempDir, "diagram.svg");
  try {
    fs.writeFileSync(sourcePath, dotText, "utf8");
    const result = spawnSync("dot", ["-Tsvg", sourcePath, "-o", outputPath], {
      encoding: "utf8",
      timeout: 10000,
    });
    if (result.status === 0 && fs.existsSync(outputPath)) {
      const rendered = fs.readFileSync(outputPath, "utf8");
      if (rendered.includes("<svg")) {
        return { warning: null };
      }
    }
    if (result.error != null) {
      return { error: diagnostic("D090", null, String(result.error)) };
    }
    const details = (result.stderr || result.stdout || "").trim().split(/\r?\n/)[0] || "dot render failed";
    return { error: diagnostic("D090", null, details) };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function extractMarkdownDotBlocks(markdownText) {
  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    if (!DOT_FENCE_RE.test(lines[idx].trim())) {
      continue;
    }
    const startLine = idx + 1;
    let endIdx = idx + 1;
    while (endIdx < lines.length && lines[endIdx].trim() !== "```") {
      endIdx += 1;
    }
    if (endIdx >= lines.length) {
      endIdx = lines.length - 1;
    }
    blocks.push({
      startLine,
      endLine: endIdx + 1,
      text: lines.slice(idx + 1, endIdx).join("\n"),
    });
    idx = endIdx;
  }
  return blocks;
}

export function collectDotDiagnostics(dotText, { lineOffset = 0, render = true } = {}) {
  const errors = [];
  const warnings = [];
  const lines = dotText.split(/\r?\n/);
  const firstLine = lineOffset + 1;
  const graphDefaults = extractDefaultStatement(dotText, "graph");
  const nodeDefaults = extractDefaultStatement(dotText, "node");
  const edgeDefaults = extractDefaultStatement(dotText, "edge");
  const clusters = extractClusterBlocks(dotText);
  const nodes = extractNodeStatements(dotText);

  if (!dotText.includes('fontname="Noto Sans CJK SC"')) {
    if (graphDefaults == null) {
      errors.push(diagnostic("D001", firstLine));
    }
    if (nodeDefaults == null) {
      errors.push(diagnostic("D002", firstLine));
    }
    if (edgeDefaults == null) {
      errors.push(diagnostic("D003", firstLine));
    }
  } else {
    if (graphDefaults == null || graphDefaults.attrs.fontname !== "Noto Sans CJK SC") {
      errors.push(diagnostic("D001", lineNumberForRegex(lines, /^\s*graph\s*\[/, lineOffset)));
    }
    if (nodeDefaults == null || nodeDefaults.attrs.fontname !== "Noto Sans CJK SC") {
      errors.push(diagnostic("D002", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
    }
    if (edgeDefaults == null || edgeDefaults.attrs.fontname !== "Noto Sans CJK SC") {
      errors.push(diagnostic("D003", lineNumberForRegex(lines, /^\s*edge\s*\[/, lineOffset)));
    }
  }

  if (dotText.includes("Arial")) {
    errors.push(diagnostic("D004", lineNumberForRegex(lines, /Arial/, lineOffset)));
  }

  if (graphDefaults == null || graphDefaults.attrs.bgcolor !== "transparent") {
    errors.push(diagnostic("D010", lineNumberForRegex(lines, /^\s*graph\s*\[/, lineOffset)));
  }

  const nodeStyle = styleTokens(nodeDefaults?.attrs.style);
  const nodeShape = nodeDefaults?.attrs.shape ?? null;
  if (!nodeStyle.includes("filled")) {
    errors.push(diagnostic("D011", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
  }
  if ((nodeShape == null || nodeShape === "box") && !nodeStyle.includes("rounded")) {
    errors.push(diagnostic("D012", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
  }
  if (!hasExplicitColor(nodeDefaults?.attrs.color)) {
    errors.push(diagnostic("D013", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
  }
  if (!hasExplicitColor(nodeDefaults?.attrs.fontcolor)) {
    errors.push(diagnostic("D014", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
  }
  if (!hasExplicitColor(nodeDefaults?.attrs.fillcolor)) {
    errors.push(diagnostic("D015", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset)));
  }

  const defaultContrast = contrastRatio(nodeDefaults?.attrs.fontcolor, nodeDefaults?.attrs.fillcolor);
  if (defaultContrast !== null && defaultContrast < 4.5) {
    errors.push(diagnostic("D016", lineNumberForRegex(lines, /^\s*node\s*\[/, lineOffset), null, {
      ratio: defaultContrast.toFixed(2),
    }));
  }

  for (const node of nodes) {
    const fontcolor = node.attrs.fontcolor ?? nodeDefaults?.attrs.fontcolor;
    const fillcolor = node.attrs.fillcolor ?? nodeDefaults?.attrs.fillcolor;
    const ratio = contrastRatio(fontcolor, fillcolor);
    if (ratio !== null && ratio < 4.5) {
      errors.push(diagnostic("D017", lineNumberForRegex(lines, new RegExp(`^\\s*${node.id}\\s*\\[`), lineOffset), node.raw.trim(), {
        node: node.id,
        ratio: ratio.toFixed(2),
      }));
    }
  }

  if (!hasExplicitColor(edgeDefaults?.attrs.color)) {
    errors.push(diagnostic("D020", lineNumberForRegex(lines, /^\s*edge\s*\[/, lineOffset)));
  }
  if (!hasExplicitColor(edgeDefaults?.attrs.fontcolor)) {
    errors.push(diagnostic("D021", lineNumberForRegex(lines, /^\s*edge\s*\[/, lineOffset)));
  }

  for (const cluster of clusters) {
    const clusterLine = lineNumberForRegex(lines, new RegExp(`subgraph\\s+${cluster.id}\\b`), lineOffset);
    if (!hasExplicitColor(cluster.attrs.color)) {
      errors.push(diagnostic("D030", clusterLine, cluster.id));
    }
    if (!hasExplicitColor(cluster.attrs.fontcolor)) {
      errors.push(diagnostic("D031", clusterLine, cluster.id));
    }
  }

  if (render) {
    const renderResult = smokeRender(dotText);
    if (renderResult.error) {
      errors.push(renderResult.error);
    }
    if (renderResult.warning) {
      warnings.push(renderResult.warning);
    }
  }

  return { errors: dedupeDiagnostics(errors), warnings: dedupeDiagnostics(warnings) };
}

export function collectMarkdownDotDiagnostics(markdownText, { allowNoBlocks = false, render = true } = {}) {
  const blocks = extractMarkdownDotBlocks(markdownText);
  const diagnostics = { errors: [], warnings: [] };
  if (blocks.length === 0) {
    if (!allowNoBlocks) {
      diagnostics.errors.push(diagnostic("D040", 1));
    }
    return diagnostics;
  }
  for (const block of blocks) {
    const blockDiagnostics = collectDotDiagnostics(block.text, { lineOffset: block.startLine, render });
    diagnostics.errors.push(...blockDiagnostics.errors);
    diagnostics.warnings.push(...blockDiagnostics.warnings);
  }
  diagnostics.errors = dedupeDiagnostics(diagnostics.errors);
  diagnostics.warnings = dedupeDiagnostics(diagnostics.warnings);
  return diagnostics;
}

export function collectMarkdownDotErrors(markdownText, options = {}) {
  return collectMarkdownDotDiagnostics(markdownText, options).errors;
}

function dedupeDiagnostics(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.code}:${item.line ?? "?"}:${item.content ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatCliItem(item) {
  const location = item.line == null ? "" : `:${item.line}`;
  const content = item.content ? `\n  ${item.content}` : "";
  return `${item.code}${location} ${item.message}${content}`;
}

function usage(stderr) {
  stderr.write("usage: dotctl validate <path>\n");
  stderr.write("       dotctl validate-dot <path>\n");
  stderr.write("       dotctl validate-markdown <path>\n");
}

export function main(argv = process.argv.slice(2), { stdout = process.stdout, stderr = process.stderr } = {}) {
  if (argv.length !== 2) {
    usage(stderr);
    return 2;
  }

  const [command, targetArg] = argv;
  if (!["validate", "validate-dot", "validate-markdown"].includes(command)) {
    usage(stderr);
    return 2;
  }

  const targetPath = path.resolve(targetArg);
  const text = fs.readFileSync(targetPath, "utf8");
  let diagnostics;

  if (command === "validate-dot" || (command === "validate" && /\.(?:dot|gv)$/i.test(targetPath))) {
    diagnostics = collectDotDiagnostics(text);
  } else {
    diagnostics = collectMarkdownDotDiagnostics(text);
  }

  if (diagnostics.errors.length === 0) {
    stdout.write(`dot ok: ${targetPath}\n`);
    for (const warning of diagnostics.warnings) {
      stderr.write(`${formatCliItem(warning)}\n`);
    }
    return 0;
  }

  stderr.write(`dot invalid: ${targetPath}\n`);
  for (const error of diagnostics.errors) {
    stderr.write(`${formatCliItem(error)}\n`);
  }
  for (const warning of diagnostics.warnings) {
    stderr.write(`${formatCliItem(warning)}\n`);
  }
  return 1;
}

if (process.argv[1] != null && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main();
}
