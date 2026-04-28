#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ERROR_CODE_CATALOG_PATH = path.resolve(__dirname, "..", "..", "references", "validator-error-codes.yaml");
const SPEC_FILENAME_SUFFIX = "-spec.md";
const SPEC_TITLE_SUFFIX = "设计文档";
const REQUIRED_H1 = [
  "背景与现状",
  "目标与非目标",
  "风险与红线",
  "边界与契约",
  "架构总览",
  "架构分层",
  "模块划分",
  "验收标准",
  "访谈记录",
  "参考文档",
];
const DOT_FENCE_RE = /^```(?:dot|graphviz)\s*$/;

let errorCatalogCache = null;

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

function err(code, lines, lineIdx = null, content = null, params = {}) {
  let actualContent = content;
  if (actualContent == null && lineIdx != null && lineIdx >= 0 && lineIdx < lines.length) {
    actualContent = lines[lineIdx].replace(/\r$/, "");
  }
  return {
    code,
    message: errorMessage(code, params),
    line: lineIdx == null ? null : lineIdx + 1,
    content: actualContent || null,
  };
}

function parseSections(lines, level) {
  const prefix = `${"#".repeat(level)} `;
  const sections = [];
  lines.forEach((line, idx) => {
    if (line.startsWith(prefix)) {
      sections.push([idx, line.slice(prefix.length).trim()]);
    }
  });
  return sections;
}

function sectionSlice(sections, title, linesLen) {
  for (let i = 0; i < sections.length; i += 1) {
    const [start, name] = sections[i];
    if (name === title) {
      const end = i + 1 < sections.length ? sections[i + 1][0] : linesLen;
      return [start, end];
    }
  }
  return null;
}

function parseNestedSections(lines, start, end, level) {
  const local = parseSections(lines.slice(start, end), level);
  return local.map(([localStart, title], index) => {
    const absStart = start + localStart;
    const absEnd = index + 1 < local.length ? start + local[index + 1][0] : end;
    return [absStart, title, absEnd];
  });
}

function firstNonEmptyLineIdx(lines, start, end) {
  for (let idx = start; idx < end; idx += 1) {
    if (lines[idx].trim()) {
      return idx;
    }
  }
  return null;
}

function hasDotFence(lines, start, end) {
  for (let idx = start; idx < end; idx += 1) {
    if (DOT_FENCE_RE.test(lines[idx].trim())) {
      return true;
    }
  }
  return false;
}

function validateHeadingStructure(lines, pathValue) {
  const errors = [];
  const firstLine = lines[0] ?? "";
  if (!firstLine.startsWith("# ")) {
    errors.push(err("E001", lines, 0));
    return errors;
  }

  const title = firstLine.slice(2).trim();
  if (!title.endsWith(SPEC_TITLE_SUFFIX)) {
    errors.push(err("E002", lines, 0));
  }

  if (pathValue != null && !path.basename(pathValue).endsWith(SPEC_FILENAME_SUFFIX)) {
    errors.push(err("E003", lines, null, path.basename(pathValue)));
  }

  const h2Sections = parseSections(lines, 2);
  const h2Titles = h2Sections.map(([, sectionTitle]) => sectionTitle);
  if (JSON.stringify(h2Titles) !== JSON.stringify(REQUIRED_H1)) {
    const lineIdx = h2Sections.length > 0 ? h2Sections[0][0] : 0;
    errors.push(err("E010", lines, lineIdx, h2Titles.join(" / ")));
  }

  return errors;
}

function validateExactSubsections(lines, h2Sections, sectionTitle, expected, errorCode) {
  const section = sectionSlice(h2Sections, sectionTitle, lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const found = parseSections(lines.slice(start + 1, end), 3).map(([, title]) => title);
  if (JSON.stringify(found) === JSON.stringify(expected)) {
    return [];
  }
  const lineIdx = firstNonEmptyLineIdx(lines, start + 1, end) ?? start;
  return [err(errorCode, lines, lineIdx, found.join(" / ") || "<missing>")];
}

function validateRequiredDiagrams(lines, h2Sections) {
  const errors = [];

  const background = sectionSlice(h2Sections, "背景与现状", lines.length);
  if (background != null) {
    const [start, end] = background;
    const h3 = parseNestedSections(lines, start + 1, end, 3);
    const current = h3.find(([, title]) => title === "现状");
    if (current == null || !hasDotFence(lines, current[0], current[2])) {
      errors.push(err("E020", lines, current == null ? start : current[0]));
    }
  }

  const targetSection = sectionSlice(h2Sections, "目标与非目标", lines.length);
  if (targetSection != null) {
    const [start, end] = targetSection;
    const h3 = parseNestedSections(lines, start + 1, end, 3);
    const target = h3.find(([, title]) => title === "目标");
    if (target == null || !hasDotFence(lines, target[0], target[2])) {
      errors.push(err("E021", lines, target == null ? start : target[0]));
    }
  }

  const overview = sectionSlice(h2Sections, "架构总览", lines.length);
  if (overview != null) {
    const [start, end] = overview;
    if (!hasDotFence(lines, start, end)) {
      errors.push(err("E022", lines, start));
    }
  }

  return errors;
}

function validateBoundaryAndContractsDepth(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "边界与契约", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const h4 = parseSections(lines.slice(start + 1, end), 4);
  if (h4.length === 0) {
    return [];
  }
  const [lineIdx, title] = h4[0];
  return [err("E014", lines, start + 1 + lineIdx, title)];
}

function validateInterviewRecords(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "访谈记录", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  let rounds = 0;
  let idx = start + 1;

  while (idx < end) {
    const trimmed = lines[idx].trim();
    if (!trimmed) {
      idx += 1;
      continue;
    }

    if (trimmed.startsWith("Q：") || trimmed.startsWith(">Q：")) {
      errors.push(err("E031", lines, idx));
      idx += 1;
      continue;
    }
    if (trimmed.startsWith("A：") || trimmed.startsWith(">A：")) {
      errors.push(err("E033", lines, idx));
      idx += 1;
      continue;
    }

    if (!trimmed.startsWith("> Q：")) {
      idx += 1;
      continue;
    }

    rounds += 1;
    const questionIdx = idx;
    idx += 1;

    let sawBlankQuote = false;
    while (idx < end && lines[idx].trim() === ">") {
      sawBlankQuote = true;
      idx += 1;
    }
    if (!sawBlankQuote) {
      errors.push(err("E032", lines, questionIdx));
    }

    if (idx >= end) {
      errors.push(err("E033", lines, questionIdx));
      break;
    }

    const answerLine = lines[idx].trim();
    if (!answerLine.startsWith("> A：")) {
      errors.push(err("E033", lines, idx));
    } else {
      idx += 1;
    }

    while (idx < end && !lines[idx].trim()) {
      idx += 1;
    }

    if (idx >= end || !lines[idx].trim().startsWith("收敛影响：")) {
      errors.push(err("E034", lines, idx >= end ? questionIdx : idx));
      continue;
    }
    idx += 1;
  }

  if (rounds < 5) {
    errors.push(err("E030", lines, start));
  }

  return errors;
}

export function collectErrors(text, { pathValue = null } = {}) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const errors = [];

  errors.push(...validateHeadingStructure(lines, pathValue));

  const h2Sections = parseSections(lines, 2);
  if (h2Sections.length > 0) {
    errors.push(...validateExactSubsections(lines, h2Sections, "背景与现状", ["背景", "现状"], "E011"));
    errors.push(...validateExactSubsections(lines, h2Sections, "风险与红线", ["风险", "红线行为"], "E013"));
    errors.push(...validateBoundaryAndContractsDepth(lines, h2Sections));
    errors.push(...validateRequiredDiagrams(lines, h2Sections));
    errors.push(...validateInterviewRecords(lines, h2Sections));
  }

  return dedupeErrors(errors);
}

function dedupeErrors(errors) {
  const seen = new Set();
  return errors.filter((item) => {
    const key = `${item.code}:${item.line ?? "?"}:${item.content ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

export function main(argv = process.argv.slice(2), { stdin = readStdin(), stdout = process.stdout, stderr = process.stderr } = {}) {
  const useStdinJson = argv.includes("--stdin-json");
  if (!useStdinJson) {
    stderr.write("usage: validate.mjs --stdin-json\n");
    return 2;
  }
  const payload = JSON.parse(stdin);
  const text = typeof payload.text === "string" ? payload.text : "";
  const pathValue = typeof payload.path === "string" ? payload.path : null;
  const errors = collectErrors(text, { pathValue });
  stdout.write(`${JSON.stringify({ errors }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
