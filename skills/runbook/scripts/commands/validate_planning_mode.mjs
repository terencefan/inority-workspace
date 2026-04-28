import path from "node:path";
import { promises as fs } from "node:fs";
import { lineNumber, parseSimpleYamlMap, splitLinesKeepEnds, toError } from "./shared.mjs";

const ERROR_CODE_CATALOG_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../references/validator-error-codes.yaml");
let errorCatalogCache = null;

const REQUIRED_H2_BY_MODE = {
  operation: ["何时加载", "规划重点", "常见提问维度", "常见证据", "写作约束", "执行计划偏好", "风险收敛提醒"],
  code: ["何时加载", "规划重点", "常见提问维度", "常见证据", "写作约束", "执行计划偏好", "风险收敛提醒"],
};
const TITLE_BY_MODE = {
  operation: "# Operation Runbook",
  code: "# Coding Runbook",
};

async function loadErrorCatalog() {
  if (errorCatalogCache) {
    return errorCatalogCache;
  }
  errorCatalogCache = parseSimpleYamlMap(await fs.readFile(ERROR_CODE_CATALOG_PATH, "utf8"));
  return errorCatalogCache;
}

function errorMessageFromCatalog(catalog, code, params = {}) {
  const entry = catalog[code];
  if (!entry?.message) {
    throw new Error(`missing error catalog entry for ${code}`);
  }
  return entry.message.replace(/\{(\w+)\}/g, (_, key) => `${params[key] ?? ""}`);
}

function err(catalog, code, message, lines, lineIdx = null, content = null) {
  let resolvedContent = content;
  if (resolvedContent == null && lineIdx != null && lineIdx >= 0 && lineIdx < lines.length) {
    resolvedContent = lines[lineIdx].replace(/\n$/, "") || null;
  }
  return toError(code, message ?? errorMessageFromCatalog(catalog, code), lineNumber(lineIdx), resolvedContent);
}

function parseH2(lines) {
  const sections = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(lines[idx]);
    if (match) {
      sections.push([idx, match[1]]);
    }
  }
  return sections;
}

function sectionBounds(sections, title, totalLines) {
  const index = sections.findIndex(([, current]) => current === title);
  if (index === -1) {
    return null;
  }
  const start = sections[index][0];
  const end = index + 1 < sections.length ? sections[index + 1][0] : totalLines;
  return [start, end];
}

export async function collectPlanningModeErrors(text, mode) {
  if (!(mode in TITLE_BY_MODE)) {
    throw new Error(`unsupported planning mode: ${mode}`);
  }
  const catalog = await loadErrorCatalog();
  const lines = splitLinesKeepEnds(text);
  const errors = [];
  const expectedTitle = TITLE_BY_MODE[mode];
  const requiredH2 = REQUIRED_H2_BY_MODE[mode];
  const firstLine = lines[0]?.replace(/\n$/, "") ?? "";
  if (firstLine !== expectedTitle) {
    errors.push(err(catalog, "E200", errorMessageFromCatalog(catalog, "E200", { expected_title: expectedTitle }), lines, 0, firstLine || "<empty>"));
  }

  const sections = parseH2(lines);
  const foundH2 = sections.map(([, title]) => title);
  if (JSON.stringify(foundH2) !== JSON.stringify(requiredH2)) {
    const lineIdx = sections[0]?.[0] ?? 0;
    errors.push(err(catalog, "E201", errorMessageFromCatalog(catalog, "E201", { expected_order: requiredH2.join(" / ") }), lines, lineIdx, foundH2.length ? foundH2.join(" / ") : "<missing>"));
  }

  for (const [idx, line] of lines.entries()) {
    if (/^###\s+/.test(line)) {
      errors.push(err(catalog, "E202", errorMessageFromCatalog(catalog, "E202"), lines, idx));
    }
  }

  for (const title of requiredH2) {
    const bounds = sectionBounds(sections, title, lines.length);
    if (!bounds) {
      continue;
    }
    const [start, end] = bounds;
    const body = lines.slice(start + 1, end).filter((line) => line.trim());
    if (body.length === 0) {
      errors.push(err(catalog, "E203", errorMessageFromCatalog(catalog, "E203", { title }), lines, start));
      continue;
    }
    if (!body.some((line) => /^-\s+\S/.test(line.trimEnd()))) {
      errors.push(err(catalog, "E204", errorMessageFromCatalog(catalog, "E204", { title }), lines, start + 1));
    }
  }
  return errors;
}

export async function handleValidatePlanningMode(args) {
  const targetPath = path.resolve(args.path);
  let text;
  try {
    text = await fs.readFile(targetPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      const payload = { status: "fail", path: targetPath, errors: [toError("E000", `file not found: ${targetPath}`)] };
      if (args.json) {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      } else {
        process.stderr.write(`[planning-mode-validator] FAIL ${targetPath}\nE000: file not found: ${targetPath}\n`);
      }
      return 1;
    }
    throw error;
  }
  const errors = await collectPlanningModeErrors(text, args.mode);
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ status: errors.length ? "fail" : "pass", path: targetPath, mode: args.mode, errors }, null, 2)}\n`);
    return errors.length ? 1 : 0;
  }
  if (errors.length === 0) {
    process.stdout.write(`[planning-mode-validator] PASS ${targetPath} (${args.mode})\n`);
    return 0;
  }
  process.stderr.write(`[planning-mode-validator] FAIL ${targetPath} (${args.mode})\n`);
  for (const item of errors) {
    const where = item.line ? `line ${item.line}` : "line ?";
    process.stderr.write(`${item.code} ${where}: ${item.message}\n`);
  }
  return 1;
}
