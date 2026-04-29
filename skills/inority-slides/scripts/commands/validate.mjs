#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ERROR_CODE_CATALOG_PATH = path.resolve(__dirname, "..", "..", "references", "validator-error-codes.yaml");

const REQUIRED_H2 = ["大纲视图", "思维脑图", "访谈记录", "外部链接"];
const EXTERNAL_LINK_HEADER_RE = /^\|\s*(?:name|名称)\s*\|\s*(?:type|类型)\s*\|\s*(?:link|链接)\s*\|\s*desc\s*\|\s*$/i;
const EXTERNAL_LINK_SEPARATOR_RE = /^\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*$/;
const EXTERNAL_LINK_ROW_RE = /^\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*\[[^\]]+\]\([^)]+\)\s*\|\s*[^|]+\s*\|\s*$/;
const SVG_PREVIEW_LINK_RE = /SVG 灯箱预览：\s*\[[^\]]+\]\([^)]+\)/;

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
      try {
        catalog[currentCode].message = JSON.parse(raw);
      } catch {
        catalog[currentCode].message = raw.replace(/^["']|["']$/g, "");
      }
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

function firstNonEmptyLineIdx(lines, start, end) {
  for (let idx = start; idx < end; idx += 1) {
    if (lines[idx].trim()) {
      return idx;
    }
  }
  return null;
}

function parseSections(lines, level) {
  const prefix = `${"#".repeat(level)} `;
  const sections = [];
  let inFence = false;
  lines.forEach((line, idx) => {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
    }
    if (!inFence && line.startsWith(prefix)) {
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

function extractDotBlock(lines, start, end) {
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
      return [blockStart, idx, lines.slice(blockStart + 1, idx)];
    }
  }
  return null;
}

function validateOutline(lines, h2Sections) {
  const errors = [];
  const outline = sectionSlice(h2Sections, "大纲视图", lines.length);
  if (outline == null) {
    return errors;
  }
  const [start, end] = outline;
  const h3Sections = parseSections(lines.slice(start, end), 3);
  if (h3Sections.length === 0) {
    errors.push(err("S030", lines, firstNonEmptyLineIdx(lines, start + 1, end) ?? start));
    return errors;
  }
  const allSlides = [];

  for (let i = 0; i < h3Sections.length; i += 1) {
    const [localStart, title] = h3Sections[i];
    const sectionStart = start + localStart;
    const sectionEnd = i + 1 < h3Sections.length ? start + h3Sections[i + 1][0] : end;
    const sectionLines = lines.slice(sectionStart, sectionEnd);
    const hasMainline = sectionLines.some((line) => line.startsWith("- 主线："));
    const hasConfirmation = sectionLines.some((line) => line.startsWith("- 用户确认："));
    if (!hasMainline || !hasConfirmation) {
      errors.push(err("S031", lines, sectionStart, null, { title }));
    }

    const h4Sections = parseSections(sectionLines, 4);
    if (h4Sections.length === 0) {
      errors.push(err("S032", lines, sectionStart, null, { title }));
      continue;
    }

    const [firstSlideLocalStart, firstSlideTitle] = h4Sections[0];
    const firstSlideStart = sectionStart + firstSlideLocalStart;
    const firstSlideEnd = h4Sections.length > 1 ? sectionStart + h4Sections[1][0] : sectionEnd;
    const firstSlideBlock = lines.slice(firstSlideStart, firstSlideEnd).join("\n");
    if (!firstSlideBlock.includes("章节标题页")) {
      errors.push(err("S033", lines, firstSlideStart, null, { title }));
    }

    for (let j = 0; j < h4Sections.length; j += 1) {
      const [slideLocalStart, slideTitle] = h4Sections[j];
      const slideStart = sectionStart + slideLocalStart;
      const slideEnd = j + 1 < h4Sections.length ? sectionStart + h4Sections[j + 1][0] : sectionEnd;
      const block = lines.slice(slideStart, slideEnd).join("\n");
      allSlides.push({ title: slideTitle, lineIdx: slideStart });
      const hasGoalNote = block.includes("> [!NOTE]") && block.includes("> 页目标：") && block.includes("> QA 链接：");
      if (!hasGoalNote) {
        errors.push(err("S040", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("- 当前 slide 类型：")) {
        errors.push(err("S049", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("<svg")) {
        errors.push(err("S041", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("- 交互说明：")) {
        errors.push(err("S042", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("- 素材清单：")) {
        errors.push(err("S043", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("标题：")) {
        errors.push(err("S045", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("文案：")) {
        errors.push(err("S046", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("SVG 图：")) {
        errors.push(err("S047", lines, slideStart, null, { title: slideTitle }));
      }
      if (!SVG_PREVIEW_LINK_RE.test(block)) {
        errors.push(err("S048", lines, slideStart, null, { title: slideTitle }));
      }
      if (!block.includes("- 页级验收标准：")) {
        errors.push(err("S044", lines, slideStart, null, { title: slideTitle }));
      }
    }
  }

  const finalSlide = allSlides.at(-1);
  if (finalSlide != null && !finalSlide.title.startsWith("致谢")) {
    errors.push(err("S034", lines, finalSlide.lineIdx, null));
  }

  return errors;
}

function validateMindmap(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "思维脑图", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  const dotBlock = extractDotBlock(lines, start, end);
  if (dotBlock == null) {
    errors.push(err("S020", lines, firstNonEmptyLineIdx(lines, start + 1, end) ?? start));
    return errors;
  }
  const [, , dotLines] = dotBlock;
  const dotText = dotLines.join("\n");
  if (!dotText.includes("Noto Sans CJK SC")) {
    errors.push(err("S021", lines, dotBlock[0]));
  }
  return errors;
}

function validateInterviews(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "访谈记录", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  const h3Sections = parseSections(lines.slice(start, end), 3);
  if (h3Sections.length < 3) {
    errors.push(err("S050", lines, firstNonEmptyLineIdx(lines, start + 1, end) ?? start));
  }
  for (let i = 0; i < h3Sections.length; i += 1) {
    const [localStart, title] = h3Sections[i];
    if (!title.startsWith("Q：")) {
      errors.push(err("S051", lines, start + localStart));
      continue;
    }
    const blockStart = start + localStart;
    const blockEnd = i + 1 < h3Sections.length ? start + h3Sections[i + 1][0] : end;
    const block = lines.slice(blockStart, blockEnd).join("\n");
    if (!block.includes("> A：") || !block.includes("访谈时间：") || !block.includes("影响面：")) {
      errors.push(err("S052", lines, blockStart));
    }
  }
  return errors;
}

function validateExternalLinks(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "外部链接", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  const contentLines = lines.slice(start + 1, end).filter((line) => line.trim());
  if (contentLines.length === 0) {
    errors.push(err("S060", lines, start));
    return errors;
  }
  if (contentLines.length < 3) {
    errors.push(err("S061", lines, start));
    return errors;
  }
  if (!EXTERNAL_LINK_HEADER_RE.test(contentLines[0]) || !EXTERNAL_LINK_SEPARATOR_RE.test(contentLines[1])) {
    errors.push(err("S061", lines, start + 1));
    return errors;
  }
  const rows = contentLines.slice(2);
  if (rows.length === 0 || rows.some((line) => !EXTERNAL_LINK_ROW_RE.test(line))) {
    errors.push(err("S061", lines, start + 2));
  }
  return errors;
}

function collectErrorsCore(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const errors = [];
  if (!lines[0]?.startsWith("# ")) {
    errors.push(err("S001", lines, 0));
    return errors;
  }
  if (lines[1] !== "") {
    errors.push(err("S002", lines, 1));
  }
  if (lines[2] !== "> [!NOTE]") {
    errors.push(err("S002", lines, 2));
  }
  if (lines[3] !== "> 当前模式：`slides`") {
    errors.push(err("S003", lines, 3));
  }

  const h2Sections = parseSections(lines, 2);
  const h2Titles = h2Sections.map(([, title]) => title);
  if (JSON.stringify(h2Titles) !== JSON.stringify(REQUIRED_H2)) {
    let mismatchIdx = 0;
    for (; mismatchIdx < Math.min(REQUIRED_H2.length, h2Titles.length); mismatchIdx += 1) {
      if (REQUIRED_H2[mismatchIdx] !== h2Titles[mismatchIdx]) {
        break;
      }
    }
    const lineIdx = mismatchIdx < h2Sections.length ? h2Sections[mismatchIdx][0] : null;
    errors.push(err("S010", lines, lineIdx, h2Titles.length > 0 ? h2Titles.join(" / ") : "<missing>", {
      expected_order: REQUIRED_H2.join(" / "),
    }));
  }

  errors.push(
    ...validateOutline(lines, h2Sections),
    ...validateMindmap(lines, h2Sections),
    ...validateInterviews(lines, h2Sections),
    ...validateExternalLinks(lines, h2Sections),
  );
  return errors;
}

export function collectErrors(text) {
  return collectErrorsCore(text);
}

function buildNaturalLanguageSummary(errors) {
  const summary = [`本次扫描共发现 ${errors.length} 个问题，当前 slides 规划还不能进入实现态`];
  errors.forEach((item, index) => {
    const location = item.line == null ? "某处" : `第 ${item.line} 行`;
    let detail = `${location}需要修正：${item.message}`;
    if (item.content) {
      detail += ` 当前命中的内容是：${item.content}`;
    }
    summary.push(`${index + 1}. ${detail}`);
  });
  summary.push("请先按以上问题修正文档，再重新运行 slidesctl validate");
  return summary;
}

export function printPass(filePath, jsonMode = false) {
  if (jsonMode) {
    console.log(JSON.stringify({ status: "pass", path: `${filePath}`, errors: [] }, null, 2));
    return;
  }
  console.log(`[slides-validator] PASS ${filePath}`);
}

export function printFail(filePath, errors, jsonMode = false) {
  const summary = buildNaturalLanguageSummary(errors);
  if (jsonMode) {
    console.log(JSON.stringify({
      status: "fail",
      path: `${filePath}`,
      errors,
      natural_language_summary: summary.join("\n"),
      natural_language_items: summary,
    }, null, 2));
    return;
  }
  console.log(`[slides-validator] FAIL ${filePath}`);
  errors.forEach((item) => {
    const location = item.line == null ? "" : ` line ${item.line}`;
    console.log(`- ${item.code}${location}: ${item.message}`);
    if (item.content) {
      console.log(`  content: ${item.content}`);
    }
  });
}

export async function handleValidate(args) {
  const filePath = path.resolve(args.path);
  if (!fs.existsSync(filePath)) {
    printFail(filePath, [{ code: "S000", message: errorMessage("S000", { path: filePath }), line: null, content: null }], args.json);
    return 2;
  }
  const text = fs.readFileSync(filePath, "utf8");
  const errors = collectErrorsCore(text);
  if (errors.length > 0) {
    printFail(filePath, errors, args.json);
    return 1;
  }
  printPass(filePath, args.json);
  return 0;
}
