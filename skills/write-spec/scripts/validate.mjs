import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { lineNumber, parseSimpleYamlMap, pathExists, splitLinesKeepEnds, toError } from "./shared.mjs";

export const REQUIRED_H2 = [
  "背景与现状",
  "目标与非目标",
  "风险与收益",
  "假设与约束",
  "架构总览",
  "架构分层",
  "模块划分",
  "访谈记录",
  "外部链接",
];
export const OPTIONAL_H2 = new Set(["方案设计"]);

export const REQUIRED_H3_PREFIXES = {
  "背景与现状": ["背景", "现状"],
  "目标与非目标": ["目标", "非目标"],
  "风险与收益": ["风险", "收益"],
  "假设与约束": ["假设", "约束"],
};

const ERROR_CODE_CATALOG_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../references/validator-error-codes.yaml");
let errorCatalogCache = null;
const HTTP_LINK_TIMEOUT_MS = 5000;

export async function loadErrorCatalog() {
  if (errorCatalogCache) {
    return errorCatalogCache;
  }
  errorCatalogCache = parseSimpleYamlMap(await fs.readFile(ERROR_CODE_CATALOG_PATH, "utf8"));
  return errorCatalogCache;
}

export async function errorMessage(code, params = {}) {
  const catalog = await loadErrorCatalog();
  const entry = catalog[code];
  if (!entry?.message) {
    throw new Error(`missing error catalog entry for ${code}`);
  }
  return entry.message.replace(/\{(\w+)\}/g, (_, key) => `${params[key] ?? ""}`);
}

function errorMessageFromCatalog(catalog, code, params = {}) {
  const entry = catalog[code];
  if (!entry?.message) {
    throw new Error(`missing error catalog entry for ${code}`);
  }
  return entry.message.replace(/\{(\w+)\}/g, (_, key) => `${params[key] ?? ""}`);
}

function err(catalog, code, lines, lineIdx = null, params = {}, content = null) {
  let resolvedContent = content;
  if (resolvedContent == null && lineIdx != null && lineIdx >= 0 && lineIdx < lines.length) {
    resolvedContent = lines[lineIdx].replace(/\n$/, "") || null;
  }
  return toError(code, errorMessageFromCatalog(catalog, code, params), lineNumber(lineIdx), resolvedContent);
}

function headingInfo(lines) {
  const headings = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const match = lines[idx].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    headings.push({
      lineIdx: idx,
      level: match[1].length,
      title: match[2].trim(),
    });
  }
  return headings;
}

function firstNonEmptyLineIdx(lines, start = 0) {
  for (let idx = start; idx < lines.length; idx += 1) {
    if (lines[idx].trim()) {
      return idx;
    }
  }
  return null;
}

function sectionBounds(headings, level, title, totalLines) {
  const index = headings.findIndex((item) => item.level === level && item.title === title);
  if (index === -1) {
    return null;
  }
  const start = headings[index].lineIdx;
  let end = totalLines;
  for (let idx = index + 1; idx < headings.length; idx += 1) {
    if (headings[idx].level <= level) {
      end = headings[idx].lineIdx;
      break;
    }
  }
  return { start, end, headingLineIdx: headings[index].lineIdx };
}

function subheadingsWithin(headings, start, end, level) {
  return headings.filter((item) => item.level === level && item.lineIdx > start && item.lineIdx < end);
}

function extractFirstDotBlock(lines, start, end) {
  let blockStart = null;
  for (let idx = start; idx < end; idx += 1) {
    if (lines[idx].trim() === "```dot") {
      blockStart = idx;
      break;
    }
  }
  if (blockStart == null) {
    return null;
  }
  for (let idx = blockStart + 1; idx < end; idx += 1) {
    if (lines[idx].trim() === "```") {
      return {
        start: blockStart,
        end: idx,
        text: lines.slice(blockStart + 1, idx).join(""),
      };
    }
  }
  return {
    start: blockStart,
    end,
    text: lines.slice(blockStart + 1, end).join(""),
  };
}

function validateTitle(catalog, lines, headings) {
  const errors = [];
  const firstLineIdx = firstNonEmptyLineIdx(lines);
  if (firstLineIdx == null) {
    return [err(catalog, "E001", lines, 0)];
  }
  if (!lines[firstLineIdx].match(/^#\s+\S/)) {
    errors.push(err(catalog, "E001", lines, firstLineIdx));
  }
  const h1 = headings.filter((item) => item.level === 1);
  if (h1.length === 0) {
    errors.push(err(catalog, "E001", lines, firstLineIdx));
    return errors;
  }
  if (h1[0].lineIdx !== firstLineIdx) {
    errors.push(err(catalog, "E001", lines, h1[0].lineIdx));
  }
  for (const extra of h1.slice(1)) {
    errors.push(err(catalog, "E002", lines, extra.lineIdx, { title: extra.title }));
  }
  return errors;
}

function validateRequiredH2(catalog, lines, headings) {
  const errors = [];
  const h2 = headings.filter((item) => item.level === 2);
  const actual = h2.map((item) => item.title);
  const normalized = actual.filter((title) => !OPTIONAL_H2.has(title));
  const optionalMisplaced = actual.some((title, index) => title === "方案设计" && (index === 0 || actual[index - 1] !== "模块划分"));
  if (JSON.stringify(normalized) !== JSON.stringify(REQUIRED_H2) || optionalMisplaced) {
    const lineIdx = h2[0]?.lineIdx ?? firstNonEmptyLineIdx(lines, 1) ?? 0;
    errors.push(err(catalog, "E010", lines, lineIdx, { expected_order: REQUIRED_H2.join(" / ") }, actual.join(" / ") || "<missing>"));
  }
  return errors;
}

function validateRequiredH3Prefixes(catalog, lines, headings) {
  const errors = [];
  for (const [h2Title, requiredPrefixes] of Object.entries(REQUIRED_H3_PREFIXES)) {
    const section = sectionBounds(headings, 2, h2Title, lines.length);
    if (!section) {
      continue;
    }
    const h3 = subheadingsWithin(headings, section.start, section.end, 3).map((item) => item.title);
    const actualPrefixes = h3.slice(0, requiredPrefixes.length);
    if (JSON.stringify(actualPrefixes) !== JSON.stringify(requiredPrefixes)) {
      errors.push(
        err(catalog, "E011", lines, section.headingLineIdx, {
          h2_title: h2Title,
          expected_order: requiredPrefixes.join(" / "),
        }, h3.join(" / ") || "<missing>"),
      );
    }
  }
  return errors;
}

function validateDotSection(catalog, lines, headings, h2Title, h3Title = null) {
  const section = h3Title == null
    ? sectionBounds(headings, 2, h2Title, lines.length)
    : (() => {
        const parent = sectionBounds(headings, 2, h2Title, lines.length);
        if (!parent) {
          return null;
        }
        const child = subheadingsWithin(headings, parent.start, parent.end, 3).find((item) => item.title === h3Title);
        if (!child) {
          return null;
        }
        let end = parent.end;
        for (const heading of headings) {
          if (heading.lineIdx > child.lineIdx && heading.level <= 3) {
            end = heading.lineIdx;
            break;
          }
        }
        return { start: child.lineIdx, end, headingLineIdx: child.lineIdx };
      })();
  if (!section) {
    return [];
  }
  const title = h3Title ?? h2Title;
  const block = extractFirstDotBlock(lines, section.start, section.end);
  if (!block) {
    return [err(catalog, "E020", lines, section.headingLineIdx, { title })];
  }
  const errors = [];
  if (!/graph\s*\[\s*bgcolor\s*=\s*"transparent"/.test(block.text)) {
    errors.push(err(catalog, "E021", lines, block.start, { title }));
  }
  if (!/node\s*\[[^\]]*style\s*=\s*"[^"]*\bfilled\b[^"]*"/.test(block.text) || !/node\s*\[[^\]]*style\s*=\s*"[^"]*\brounded\b[^"]*"/.test(block.text)) {
    errors.push(err(catalog, "E022", lines, block.start, { title }));
  }
  if (!/node\s*\[[^\]]*\bfillcolor\s*=/.test(block.text)) {
    errors.push(err(catalog, "E023", lines, block.start, { title }));
  }
  return errors;
}

function validateExternalLinks(catalog, lines, headings) {
  const section = sectionBounds(headings, 2, "外部链接", lines.length);
  if (!section) {
    return [];
  }
  const body = lines.slice(section.start + 1, section.end).join("");
  const errors = [];
  if (!body.trim()) {
    errors.push(err(catalog, "E041", lines, section.headingLineIdx));
    return errors;
  }
  if (!/\[[^\]]+\]\([^)]+\)/.test(body)) {
    errors.push(err(catalog, "E042", lines, section.headingLineIdx));
  }
  return errors;
}

function extractMarkdownLinks(text) {
  return Array.from(text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g), match => ({
    href: match[2].trim(),
  }));
}

async function canReachHttpUrl(href) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_LINK_TIMEOUT_MS);
  try {
    let response = await fetch(href, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 405 || response.status === 403) {
      response = await fetch(href, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      return response.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function canReachLocalHref(href, filePath) {
  if (!filePath) {
    return true;
  }
  const cleanHref = href.split("#")[0];
  if (!cleanHref) {
    return true;
  }
  const resolved = path.isAbsolute(cleanHref)
    ? cleanHref
    : path.resolve(path.dirname(filePath), cleanHref);
  return pathExists(resolved);
}

async function validateExternalLinkReachability(catalog, lines, headings, filePath) {
  const section = sectionBounds(headings, 2, "外部链接", lines.length);
  if (!section) {
    return [];
  }
  const body = lines.slice(section.start + 1, section.end).join("");
  const links = extractMarkdownLinks(body);
  const errors = [];

  for (const link of links) {
    const href = link.href;
    if (/^https?:\/\//i.test(href)) {
      if (!(await canReachHttpUrl(href))) {
        errors.push(err(catalog, "E043", lines, section.headingLineIdx, { href }, href));
      }
      continue;
    }

    if (!(await canReachLocalHref(href, filePath))) {
      errors.push(err(catalog, "E043", lines, section.headingLineIdx, { href }, href));
    }
  }

  return errors;
}

function validateInterview(catalog, lines, headings) {
  const section = sectionBounds(headings, 2, "访谈记录", lines.length);
  if (!section) {
    return [];
  }
  const blockLines = lines.slice(section.start + 1, section.end);
  const qLines = [];
  const aLines = [];
  const impactLines = [];
  for (let idx = 0; idx < blockLines.length; idx += 1) {
    const text = blockLines[idx].replace(/\n$/, "");
    if (text.startsWith("> Q：")) {
      qLines.push(section.start + 1 + idx);
    }
    if (text.startsWith("> A：")) {
      aLines.push(section.start + 1 + idx);
    }
    if (text.startsWith("收敛影响：")) {
      impactLines.push(section.start + 1 + idx);
    }
  }
  const errors = [];
  if (qLines.length < 5 || aLines.length < 5 || impactLines.length < 5) {
    errors.push(err(catalog, "E030", lines, section.headingLineIdx));
  }
  for (const qLine of qLines) {
    const blankQuoteLine = qLine + 1;
    const answerLine = qLine + 2;
    if (lines[blankQuoteLine]?.replace(/\n$/, "") !== ">") {
      errors.push(err(catalog, "E031", lines, qLine));
      continue;
    }
    if (!lines[answerLine]?.startsWith("> A：")) {
      errors.push(err(catalog, "E032", lines, qLine));
    }
  }
  return errors;
}

export async function collectErrors(text, options = {}) {
  const { filePath = "" } = options;
  const catalog = await loadErrorCatalog();
  const lines = splitLinesKeepEnds(text);
  const headings = headingInfo(lines);
  return [
    ...validateTitle(catalog, lines, headings),
    ...validateRequiredH2(catalog, lines, headings),
    ...validateRequiredH3Prefixes(catalog, lines, headings),
    ...validateDotSection(catalog, lines, headings, "背景与现状", "现状"),
    ...validateDotSection(catalog, lines, headings, "目标与非目标", "目标"),
    ...validateDotSection(catalog, lines, headings, "架构总览"),
    ...validateInterview(catalog, lines, headings),
    ...validateExternalLinks(catalog, lines, headings),
    ...(await validateExternalLinkReachability(catalog, lines, headings, filePath)),
  ];
}

function naturalLanguageSummary(errors) {
  if (errors.length === 0) {
    return "spec 结构校验通过。";
  }
  return `spec 结构校验失败，共 ${errors.length} 个问题。`;
}

function printFail(filePath, errors) {
  console.log(`[write-spec-validator] FAIL ${filePath}`);
  for (const item of errors) {
    const location = item.line == null ? "" : `L${item.line} `;
    console.log(`- ${location}${item.code} ${item.message}`);
  }
  console.log("\n[write-spec-validator] 自然语言总结");
  console.log(naturalLanguageSummary(errors));
}

function printPass(filePath) {
  console.log(`[write-spec-validator] PASS ${filePath}`);
}

export async function main(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const positional = argv.filter((item) => item !== "--json");
  const targetPath = positional[0];

  if (!targetPath || targetPath === "--help" || targetPath === "-h") {
    console.log("usage: node scripts/validate.mjs <spec.md> [--json]");
    return 0;
  }

  const resolvedPath = path.resolve(targetPath);
  if (!(await pathExists(resolvedPath))) {
    const message = await errorMessage("E000", { path: resolvedPath });
    const payload = {
      status: "fail",
      path: resolvedPath,
      errors: [toError("E000", message, null, null)],
      natural_language_summary: "spec 文件不存在。",
    };
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`[write-spec-validator] FAIL ${resolvedPath}`);
      console.log(`- E000 ${message}`);
    }
    return 1;
  }

  const text = await fs.readFile(resolvedPath, "utf8");
  const errors = await collectErrors(text, { filePath: resolvedPath });
  if (errors.length === 0) {
    if (json) {
      console.log(JSON.stringify({
        status: "pass",
        path: resolvedPath,
        errors: [],
        natural_language_summary: naturalLanguageSummary(errors),
      }, null, 2));
    } else {
      printPass(resolvedPath);
    }
    return 0;
  }

  if (json) {
    console.log(JSON.stringify({
      status: "fail",
      path: resolvedPath,
      errors,
      natural_language_summary: naturalLanguageSummary(errors),
    }, null, 2));
  } else {
    printFail(resolvedPath, errors);
  }
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((status) => {
    process.exitCode = status;
  }).catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
