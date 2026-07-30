#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectMarkdownDotErrors } from "../../../draw-dot/scripts/dotctl.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODES_DIR = path.resolve(__dirname, "..", "..", "modes");
const DIRECTORY_OVERVIEW_BASENAME = "README.md";
const DOT_FENCE_RE = /^```(?:dot|graphviz)\s*$/;
const ANSWER_OPTION_SHORTHAND_RE = /^> A：\s*(?:(?:选项|选)\s*`?(?:\d+|[A-Za-z])`?|`?(?:\d+|[A-Za-z])`?)(?:[。；，,\s]|$)/;
const QUESTION_OPTION_SLASH_RE = /^Q：.*\b\d+\s*[/／]\s*\d+(?:\s*[/／]\s*\d+)+/;
const QUESTION_OPTION_MARKER_RE = /(?:^|[\s（(])(?:\d+[.、)）:]|[A-Za-z][.、)）:]|[一二三四五六七八九十]+[、)）:])/g;

let modeRegistryCache = null;

function parseSimpleYamlCatalog(text) {
  const lines = text.split(/\r?\n/);
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
  return catalog;
}

function loadModeRegistry() {
  if (modeRegistryCache !== null) {
    return modeRegistryCache;
  }
  const modeDirs = fs.readdirSync(MODES_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const docTypes = new Map();
  const errorCatalog = {};
  const errorCatalogPaths = [];

  for (const mode of modeDirs) {
    const validatorDir = path.join(MODES_DIR, mode, "validator");
    const rulePaths = fs.existsSync(validatorDir)
      ? fs.readdirSync(validatorDir).filter((name) => name.endsWith("rules.json")).sort().map((name) => path.join(validatorDir, name))
      : [];
    for (const rulesPath of rulePaths) {
      const payload = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
      for (const docType of payload.docTypes ?? []) {
        docTypes.set(docType.name, { ...docType, mode });
      }
    }
    const errorPath = path.join(validatorDir, "error-codes.yaml");
    if (fs.existsSync(errorPath)) {
      errorCatalogPaths.push(errorPath);
      const partial = parseSimpleYamlCatalog(fs.readFileSync(errorPath, "utf8"));
      for (const [code, value] of Object.entries(partial)) {
        errorCatalog[code] = value;
      }
    }
  }

  modeRegistryCache = { docTypes, errorCatalog, errorCatalogPaths };
  return modeRegistryCache;
}

export function listErrorCatalogPaths() {
  return [...loadModeRegistry().errorCatalogPaths];
}

export function loadErrorCatalog() {
  return { ...loadModeRegistry().errorCatalog };
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

function h2MatchesRule(actualH2, requiredH2, optionalH2 = []) {
  const optionalTitles = new Set(optionalH2.map((entry) => entry.title));
  const actualRequiredOnly = actualH2.filter((title) => !optionalTitles.has(title));
  if (JSON.stringify(actualRequiredOnly) !== JSON.stringify(requiredH2)) {
    return false;
  }
  for (const title of actualH2) {
    if (!requiredH2.includes(title) && !optionalTitles.has(title)) {
      return false;
    }
  }
  for (const optional of optionalH2) {
    const foundIndexes = actualH2
      .map((title, index) => [title, index])
      .filter(([title]) => title === optional.title)
      .map(([, index]) => index);
    if (foundIndexes.length > 1) {
      return false;
    }
    if (foundIndexes.length === 0) {
      continue;
    }
    const index = foundIndexes[0];
    if (optional.after && !(actualH2.indexOf(optional.after) < index)) {
      return false;
    }
    if (optional.before && !(index < actualH2.indexOf(optional.before))) {
      return false;
    }
  }
  return true;
}

function h2ExpectedLabel(requiredH2, optionalH2 = []) {
  let titles = [...requiredH2];
  for (const optional of optionalH2) {
    const insertAfter = optional.after == null ? -1 : titles.indexOf(optional.after);
    const insertBefore = optional.before == null ? -1 : titles.indexOf(optional.before);
    const label = `${optional.title}(可选)`;
    if (insertAfter >= 0) {
      titles.splice(insertAfter + 1, 0, label);
    } else if (insertBefore >= 0) {
      titles.splice(insertBefore, 0, label);
    } else {
      titles.push(label);
    }
  }
  return titles.join(" / ");
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

function questionContainsOptions(questionHeading) {
  if (QUESTION_OPTION_SLASH_RE.test(questionHeading)) {
    return true;
  }
  const questionBody = questionHeading.replace(/^Q：/, "").trim();
  const matches = questionBody.match(QUESTION_OPTION_MARKER_RE);
  return matches != null && matches.length >= 2;
}

function parseDocumentTypeInfo(lines) {
  const noteLineIdx = firstNonEmptyLineIdx(lines, 1, lines.length);
  if (noteLineIdx == null || lines[noteLineIdx].trim() !== "> [!NOTE]") {
    return { noteLineIdx, label: null, value: null, typeLineIdx: null };
  }
  const typeLineIdx = firstNonEmptyLineIdx(lines, noteLineIdx + 1, lines.length);
  const typeLine = typeLineIdx == null ? "" : lines[typeLineIdx].trim();
  let match = typeLine.match(/^> 当前 spec 类型：(.+)$/);
  if (match) {
    return { noteLineIdx, label: "spec", value: match[1].trim(), typeLineIdx };
  }
  match = typeLine.match(/^> 当前文档类型：(.+)$/);
  if (match) {
    return { noteLineIdx, label: "document", value: match[1].trim(), typeLineIdx };
  }
  return { noteLineIdx, label: null, value: null, typeLineIdx };
}

function parseDocumentType(lines) {
  return parseDocumentTypeInfo(lines).value;
}

function getDocRule(docType) {
  return loadModeRegistry().docTypes.get(docType) ?? null;
}

function allowedDocTypes() {
  return [...loadModeRegistry().docTypes.keys()];
}

function validateHeadingStructure(lines, pathValue) {
  const errors = [];
  const firstLine = lines[0] ?? "";
  if (!firstLine.startsWith("# ")) {
    errors.push(err("E001", lines, 0));
    return errors;
  }

  const title = firstLine.slice(2).trim();
  const typeInfo = parseDocumentTypeInfo(lines);
  const docType = typeInfo.value;
  const rule = getDocRule(docType);
  const basename = pathValue == null ? null : path.basename(pathValue);

  if (typeInfo.noteLineIdx == null || lines[typeInfo.noteLineIdx].trim() !== "> [!NOTE]") {
    errors.push(err("E004", lines, typeInfo.noteLineIdx ?? 0));
  } else if (rule == null || typeInfo.label !== rule.typeLabel) {
    errors.push(err("E005", lines, typeInfo.typeLineIdx ?? typeInfo.noteLineIdx, typeInfo.typeLineIdx == null ? null : lines[typeInfo.typeLineIdx].trim()));
  }

  if (rule == null) {
    return errors;
  }

  if (rule.titleSuffix && !title.endsWith(rule.titleSuffix)) {
    errors.push(err("E002", lines, 0));
  }
  if (rule.titlePattern && !(new RegExp(rule.titlePattern).test(title))) {
    errors.push(err(rule.titleErrorCode ?? "E057", lines, 0));
  }

  if (pathValue != null) {
    if (rule.requiredBasename && basename !== rule.requiredBasename) {
      const readmeLikeDocTypes = new Set(["Project README", "Module README"]);
      const code = docType === "contract 总纲" || docType === "spec 总纲" || readmeLikeDocTypes.has(docType) ? "E058" : "E003";
      if (docType === "contract 总纲") {
        // contract overview is exempt from contract suffix and only constrained to README.md
      } else if (docType === "spec 总纲") {
        // spec overview is also constrained to README.md
      } else {
        errors.push(err(code, lines, null, basename));
      }
    }
    if (rule.filenameSuffix && !basename.endsWith(rule.filenameSuffix)) {
      const codeByType = {
        "产品 spec": "E003",
        "技术 spec": "E003",
        "LLM 节点 spec": "E003",
        contract: "E051",
        RCA: "E056",
      };
      const errorCode = codeByType[docType] ?? "E003";
      errors.push(err(errorCode, lines, null, basename));
    }
    if (docType === "README" && basename !== DIRECTORY_OVERVIEW_BASENAME) {
      errors.push(err("E058", lines, null, basename));
    }
  }

  const h2Sections = parseSections(lines, 2);
  const h2Titles = h2Sections.map(([, sectionTitle]) => sectionTitle);
  const expectedH2 = rule.requiredH2 ?? null;
  const optionalH2 = rule.optionalH2 ?? [];
  if (expectedH2 != null && !h2MatchesRule(h2Titles, expectedH2, optionalH2)) {
    const lineIdx = h2Sections.length > 0 ? h2Sections[0][0] : 0;
    errors.push(err("E010", lines, lineIdx, h2Titles.join(" / "), { expected: h2ExpectedLabel(expectedH2, optionalH2) }));
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

function validateRedLineCautions(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "风险与红线", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  const h3 = parseNestedSections(lines, start + 1, end, 3);
  const redLines = h3.find(([, title]) => title === "红线行为");
  if (redLines == null) {
    return errors;
  }

  const [, , redLinesEnd] = redLines;
  let idx = redLines[0] + 1;
  let cautionCount = 0;

  while (idx < redLinesEnd) {
    const trimmed = lines[idx].trim();
    if (!trimmed) {
      idx += 1;
      continue;
    }

    if (trimmed !== "> [!CAUTION]") {
      errors.push(err("E014", lines, idx));
      idx += 1;
      continue;
    }

    cautionCount += 1;
    idx += 1;
    let hasCautionBody = false;
    while (idx < redLinesEnd) {
      const bodyLine = lines[idx].trim();
      if (!bodyLine) {
        break;
      }
      if (bodyLine === "> [!CAUTION]") {
        break;
      }
      if (!bodyLine.startsWith(">")) {
        errors.push(err("E014", lines, idx));
        break;
      }
      if (bodyLine !== ">") {
        hasCautionBody = true;
      }
      idx += 1;
    }
    if (!hasCautionBody) {
      errors.push(err("E014", lines, idx - 1));
    }
  }

  if (cautionCount === 0) {
    errors.push(err("E014", lines, redLines[0]));
  }

  return errors;
}

function validateRequiredDiagrams(lines, h2Sections) {
  const errors = [];

  const targetSection = sectionSlice(h2Sections, "总览", lines.length);
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

function validateArchitectureModuleDepth(lines, h2Sections) {
  const errors = [];
  const targetSections = ["架构总览", "模块划分"];

  for (const sectionName of targetSections) {
    const section = sectionSlice(h2Sections, sectionName, lines.length);
    if (section == null) {
      continue;
    }
    const [start, end] = section;

    for (let idx = start + 1; idx < end; idx += 1) {
      if (/^#{5,6}\s+/.test(lines[idx])) {
        errors.push(err("E015", lines, idx));
      }
    }

    const h3Sections = parseNestedSections(lines, start + 1, end, 3);
    for (const [h3Start, h3Title, h3End] of h3Sections) {
      if (h3Title !== "控制面" && h3Title !== "数据面") {
        continue;
      }
      const h4Sections = parseNestedSections(lines, h3Start + 1, h3End, 4);
      for (const [h4Start, , h4End] of h4Sections) {
        const calloutIdx = firstNonEmptyLineIdx(lines, h4Start + 1, h4End);
        if (calloutIdx == null || !/^> \[!(?:NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]$/.test(lines[calloutIdx].trim())) {
          errors.push(err("E016", lines, calloutIdx ?? h4Start));
          continue;
        }
        let calloutBody = "";
        for (let idx = calloutIdx + 1; idx < h4End; idx += 1) {
          const trimmed = lines[idx].trim();
          if (!trimmed) {
            continue;
          }
          if (!trimmed.startsWith(">")) {
            break;
          }
          calloutBody += `${trimmed}\n`;
        }
        if (!calloutBody.includes("职责：") || !calloutBody.includes("具体组件：")) {
          errors.push(err("E016", lines, calloutIdx));
        }
      }
    }
  }

  return errors;
}

function validateOverviewReadOrderDiagram(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "推荐阅读顺序", lines.length);
  if (section != null) {
    const [start, end] = section;
    if (!hasDotFence(lines, start, end)) {
      errors.push(err("E054", lines, start));
    }
  }
  const standaloneTopology = sectionSlice(h2Sections, "阅读拓扑", lines.length);
  if (standaloneTopology != null) {
    errors.push(err("E055", lines, standaloneTopology[0]));
  }
  return errors;
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
    if (questionContainsOptions(trimmed.replace(/^>\s*/, ""))) {
      errors.push(err("E049", lines, questionIdx));
    }
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
      if (ANSWER_OPTION_SHORTHAND_RE.test(answerLine)) {
        errors.push(err("E039", lines, idx));
      }
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

function validateLlmPromptSections(lines, h2Sections) {
  const errors = [];
  if (parseDocumentType(lines) !== "LLM 节点 spec") {
    return errors;
  }

  const section = sectionSlice(h2Sections, "Prompt 设计", lines.length);
  if (section == null) {
    return [err("E006", lines, 0)];
  }

  const [start, end] = section;
  const found = parseSections(lines.slice(start + 1, end), 3).map(([, title]) => title);
  const required = ["system prompt", "user prompt"];
  const missing = required.filter((title) => !found.includes(title));
  if (missing.length > 0) {
    const lineIdx = firstNonEmptyLineIdx(lines, start + 1, end) ?? start;
    errors.push(err("E006", lines, lineIdx, missing.join(" / ")));
  }
  return errors;
}

function validateLlmUserPromptDiagram(lines, h2Sections) {
  const errors = [];
  if (parseDocumentType(lines) !== "LLM 节点 spec") {
    return errors;
  }

  const section = sectionSlice(h2Sections, "Prompt 设计", lines.length);
  if (section == null) {
    return [err("E007", lines, 0)];
  }
  const [start, end] = section;
  const h3 = parseNestedSections(lines, start + 1, end, 3);
  const userPrompt = h3.find(([, title]) => title === "user prompt");
  if (userPrompt == null || !hasDotFence(lines, userPrompt[0], userPrompt[2])) {
    errors.push(err("E007", lines, userPrompt == null ? start : userPrompt[0]));
  }
  return errors;
}

function validateProjectReadmeLinks(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "文档链接", lines.length);
  if (section == null) {
    return errors;
  }

  const [start, end] = section;
  const bullets = [];
  for (let idx = start + 1; idx < end; idx += 1) {
    const trimmed = lines[idx].trim();
    if (!trimmed) {
      continue;
    }
    bullets.push([idx, trimmed]);
  }

  if (bullets.length === 0) {
    errors.push(err("E040", lines, start));
    return errors;
  }

  for (const [idx, line] of bullets) {
    if (!line.startsWith("- [")) {
      errors.push(err("E041", lines, idx));
    }
  }

  return errors;
}

function validateBenchmarkExperimentCallouts(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "实验结果", lines.length);
  if (section == null) {
    return errors;
  }
  const [start, end] = section;
  const experiments = parseNestedSections(lines, start + 1, end, 3)
    .filter(([, title]) => title !== "结果总表");
  for (const [headingStart, , headingEnd] of experiments) {
    const calloutIdx = firstNonEmptyLineIdx(lines, headingStart + 1, headingEnd);
    const callout = calloutIdx == null ? "" : lines[calloutIdx].trim();
    const bodyIdx = calloutIdx == null ? null : firstNonEmptyLineIdx(lines, calloutIdx + 1, headingEnd);
    const body = bodyIdx == null ? "" : lines[bodyIdx].trim();
    const positive = callout === "> [!TIP]" && /^> 结论分类：显著正向/.test(body);
    const directional = callout === "> [!NOTE]" && /^> 结论分类：(正向但不显著|中性)/.test(body);
    const negative = ["> [!WARNING]", "> [!CAUTION]"].includes(callout)
      && /^> 结论分类：(负向但不显著|显著负向)/.test(body);
    const excluded = callout === "> [!IMPORTANT]" && /^> 结论分类：不相关（排除）/.test(body);
    const pending = callout === "> [!IMPORTANT]" && /^> (?:结论分类：)?测量中/.test(body);
    if (!positive && !directional && !negative && !excluded && !pending) {
      errors.push(err("E067", lines, calloutIdx ?? headingStart));
    }
    if (!pending && !excluded && !/（[+-]\d+(?:\.\d+)?%）/.test(body)) {
      errors.push(err("E069", lines, bodyIdx ?? headingStart));
    }
    let tableStart = null;
    for (let idx = (bodyIdx ?? headingStart) + 1; idx < headingEnd - 1; idx += 1) {
      const header = lines[idx].trim();
      const divider = (lines[idx + 1] ?? "").trim();
      if (header.startsWith("|") && header.endsWith("|") && /^\|(?:\s*:?-+:?\s*\|)+$/.test(divider)) {
        tableStart = idx;
        break;
      }
    }
    if (tableStart == null) {
      errors.push(err("E068", lines, headingStart));
    }
  }
  return errors;
}

function validateBenchmarkMetricFormulas(lines, h2Sections) {
  const errors = [];
  const methodSection = sectionSlice(h2Sections, "方法", lines.length);
  if (methodSection == null) {
    return errors;
  }
  const methodSubsections = parseNestedSections(lines, methodSection[0] + 1, methodSection[1], 3);
  const statisticsSection = methodSubsections.find(([, title]) => title === "统计方法");
  if (statisticsSection == null) {
    return errors;
  }

  const [statisticsStart, , statisticsEnd] = statisticsSection;
  const metrics = parseNestedSections(lines, statisticsStart + 1, statisticsEnd, 4);
  if (metrics.length === 0) {
    errors.push(err("E070", lines, statisticsStart));
    return errors;
  }

  for (const [metricStart, , metricEnd] of metrics) {
    const calloutIdx = firstNonEmptyLineIdx(lines, metricStart + 1, metricEnd);
    const callout = calloutIdx == null ? "" : lines[calloutIdx].trim();
    if (!/^> \[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/.test(callout)) {
      errors.push(err("E071", lines, calloutIdx ?? metricStart));
    }
    const hasFormula = lines
      .slice(metricStart + 1, metricEnd)
      .some((line) => /^```(?:katex|math)\s*$/.test(line.trim()));
    if (!hasFormula) {
      errors.push(err("E072", lines, metricStart));
    }
  }
  return errors;
}

function validateReferenceSection(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "参考资料", lines.length);
  if (section == null) {
    return errors;
  }

  const [start, end] = section;
  const bullets = [];
  for (let idx = start + 1; idx < end; idx += 1) {
    const trimmed = lines[idx].trim();
    if (!trimmed) {
      continue;
    }
    bullets.push([idx, trimmed]);
  }

  if (bullets.length === 0) {
    errors.push(err("E040", lines, start));
    return errors;
  }

  for (const [idx, line] of bullets) {
    if (!line.startsWith("- [")) {
      errors.push(err("E041", lines, idx));
    }
  }

  return errors;
}

function validateComparisonSection(lines, h2Sections) {
  const errors = [];
  const section = sectionSlice(h2Sections, "方案对比", lines.length);
  if (section == null) {
    return errors;
  }

  const [start, end] = section;
  const groups = parseNestedSections(lines, start + 1, end, 3);
  if (groups.length === 0) {
    errors.push(err("E040", lines, start));
    return errors;
  }

  for (const [groupStart, title, groupEnd] of groups) {
    let hasConclusionNote = false;
    for (let idx = groupStart + 1; idx < groupEnd; idx += 1) {
      if (lines[idx].trim() !== "> [!NOTE]") {
        continue;
      }
      const next = lines[idx + 1]?.trim() ?? "";
      if (next.startsWith("> 对比结论：")) {
        hasConclusionNote = true;
        break;
      }
    }
    if (!hasConclusionNote) {
      errors.push(err("E041", lines, groupStart, title));
    }
  }

  return errors;
}

function parseExperimentId(value) {
  const match = value.match(/^([A-Za-z]+)(\d+)([a-z]*)$/);
  if (!match) {
    return null;
  }
  return { prefix: match[1].toUpperCase(), number: Number(match[2]), suffix: match[3] };
}

function collectBenchmarkExperimentIds(lines, h2Sections) {
  const groupsSection = sectionSlice(h2Sections, "实验组", lines.length);
  const resultsSection = sectionSlice(h2Sections, "实验结果", lines.length);
  const groupIds = [];
  const resultIds = [];

  if (groupsSection != null) {
    for (let idx = groupsSection[0] + 1; idx < groupsSection[1]; idx += 1) {
      const match = lines[idx].match(/^\|\s*([A-Za-z]+\d+[a-z]*)\b/);
      if (match && parseExperimentId(match[1])) {
        groupIds.push({ id: match[1], lineIdx: idx });
      }
    }
  }

  if (resultsSection != null) {
    for (let idx = resultsSection[0] + 1; idx < resultsSection[1]; idx += 1) {
      const match = lines[idx].match(/^###\s+([A-Za-z]+\d+[a-z]*)\b/);
      if (match && parseExperimentId(match[1])) {
        resultIds.push({ id: match[1], lineIdx: idx });
      }
    }
  }

  return { groupIds, resultIds };
}

function sameIdMultiset(left, right) {
  const counts = (items) => {
    const result = new Map();
    for (const { id } of items) {
      result.set(id, (result.get(id) ?? 0) + 1);
    }
    return result;
  };
  const leftCounts = counts(left);
  const rightCounts = counts(right);
  return leftCounts.size === rightCounts.size
    && [...leftCounts].every(([id, count]) => rightCounts.get(id) === count && count === 1);
}

function firstNonIncreasingExperiment(items) {
  const previousByPrefix = new Map();
  for (const item of items) {
    const parsed = parseExperimentId(item.id);
    const previous = previousByPrefix.get(parsed.prefix);
    if (previous != null) {
      const increasing = parsed.number > previous.number
        || (parsed.number === previous.number && parsed.suffix > previous.suffix);
      if (!increasing) {
        return item;
      }
    }
    previousByPrefix.set(parsed.prefix, parsed);
  }
  return null;
}

function validateBenchmarkExperimentMapping(lines, h2Sections) {
  const { groupIds, resultIds } = collectBenchmarkExperimentIds(lines, h2Sections);
  if (!sameIdMultiset(groupIds, resultIds)) {
    const lineIdx = groupIds[0]?.lineIdx ?? resultIds[0]?.lineIdx ?? 0;
    return [err("E065", lines, lineIdx, `实验组: ${groupIds.map(({ id }) => id).join(", ")}；实验结果: ${resultIds.map(({ id }) => id).join(", ")}`)];
  }

  const sameOrder = groupIds.every(({ id }, index) => resultIds[index]?.id === id);
  const nonIncreasing = firstNonIncreasingExperiment(groupIds) ?? firstNonIncreasingExperiment(resultIds);
  if (!sameOrder || nonIncreasing != null) {
    const lineIdx = nonIncreasing?.lineIdx ?? groupIds[0]?.lineIdx ?? 0;
    return [err("E066", lines, lineIdx, `实验组: ${groupIds.map(({ id }) => id).join(", ")}；实验结果: ${resultIds.map(({ id }) => id).join(", ")}`)];
  }
  return [];
}

export function collectErrors(text, { pathValue = null } = {}) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const errors = [];
  const docType = parseDocumentType(lines);
  const rule = getDocRule(docType);

  errors.push(...validateHeadingStructure(lines, pathValue));

  const h2Sections = parseSections(lines, 2);
  if (h2Sections.length > 0 && rule != null) {
    for (const item of rule.exactH3 ?? []) {
      errors.push(...validateExactSubsections(lines, h2Sections, item.section, item.expected, item.errorCode));
    }
    const flags = new Set(rule.flags ?? []);
    if (flags.has("redLineCautions")) {
      errors.push(...validateRedLineCautions(lines, h2Sections));
    }
    if (flags.has("requiredDiagrams")) {
      errors.push(...validateRequiredDiagrams(lines, h2Sections));
    }
    if (flags.has("interviewRecords")) {
      errors.push(...validateInterviewRecords(lines, h2Sections));
    }
    if (flags.has("comparisonSection")) {
      errors.push(...validateComparisonSection(lines, h2Sections));
    }
    if (flags.has("architectureModuleDepth")) {
      errors.push(...validateArchitectureModuleDepth(lines, h2Sections));
    }
    if (flags.has("llmPromptSections")) {
      errors.push(...validateLlmPromptSections(lines, h2Sections));
    }
    if (flags.has("llmUserPromptDiagram")) {
      errors.push(...validateLlmUserPromptDiagram(lines, h2Sections));
    }
    if (flags.has("overviewReadOrderDiagram")) {
      errors.push(...validateOverviewReadOrderDiagram(lines, h2Sections));
    }
    if (flags.has("referenceSection")) {
      errors.push(...validateReferenceSection(lines, h2Sections));
    }
    if (flags.has("projectReadmeLinks")) {
      errors.push(...validateProjectReadmeLinks(lines, h2Sections));
    }
    if (flags.has("experimentResultMapping")) {
      errors.push(...validateBenchmarkExperimentMapping(lines, h2Sections));
    }
    if (flags.has("benchmarkExperimentCallouts")) {
      errors.push(...validateBenchmarkExperimentCallouts(lines, h2Sections));
    }
    if (flags.has("benchmarkMetricFormulas")) {
      errors.push(...validateBenchmarkMetricFormulas(lines, h2Sections));
    }
  }
  errors.push(...collectMarkdownDotErrors(normalized, { allowNoBlocks: true }));

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

function formatCliError(error) {
  const location = error.line == null ? "" : `:${error.line}`;
  const content = error.content ? `\n  ${error.content}` : "";
  return `${error.code}${location} ${error.message}${content}`;
}

export function main(argv = process.argv.slice(2), { stdin = readStdin(), stdout = process.stdout, stderr = process.stderr } = {}) {
  const useStdinJson = argv.includes("--stdin-json");
  if (useStdinJson) {
    const payload = JSON.parse(stdin);
    const text = typeof payload.text === "string" ? payload.text : "";
    const pathValue = typeof payload.path === "string" ? payload.path : null;
    const errors = collectErrors(text, { pathValue });
    stdout.write(`${JSON.stringify({ errors }, null, 2)}\n`);
    return 0;
  }

  if (argv.length !== 1) {
    stderr.write("usage: validate.mjs --stdin-json | validate.mjs <path>\n");
    return 2;
  }

  const pathValue = path.resolve(argv[0]);
  const text = fs.readFileSync(pathValue, "utf8");
  const errors = collectErrors(text, { pathValue });
  if (errors.length === 0) {
    stdout.write(`document ok: ${pathValue}\n`);
    return 0;
  }

  stderr.write(`document invalid: ${pathValue}\n`);
  for (const error of errors) {
    stderr.write(`${formatCliError(error)}\n`);
  }
  return 1;
}

if (process.argv[1] != null && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main();
}
