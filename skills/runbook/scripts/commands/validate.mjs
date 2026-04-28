#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFile, normalizeRunbookNumbering } from "./normalize.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ERROR_CODE_CATALOG_PATH = path.resolve(__dirname, "..", "..", "references", "validator-error-codes.yaml");

const REQUIRED_H2 = [
  "背景与现状",
  "目标与非目标",
  "风险与收益",
  "思维脑图",
  "红线行为",
  "清理现场",
  "执行计划",
  "执行记录",
  "最终验收",
  "回滚方案",
  "访谈记录",
  "外部链接",
];

const REQUIRED_H3_BY_H2 = {
  "背景与现状": ["背景", "现状"],
  "目标与非目标": ["目标", "非目标"],
  "风险与收益": ["风险", "收益"],
};

const FORBIDDEN_H2 = new Set(["当前已决策", "当前前提", "编排策略", "参考文献", "问答记录"]);
const FORBIDDEN_H3 = new Set(["当前前提", "编排策略"]);

export const NUMBERED_H3_RE = /^(?:(?:🟢|🟡|🔴)\s+)?(\d+)\. (.+)$/u;
const DATE_TOKEN_RE = /\b20\d{2}[-_]?(?:0[1-9]|1[0-2])[-_]?(?:0[1-9]|[12]\d|3[01])\b/;
const RUNBOOK_FILENAME_SUFFIX = "-runbook.md";
const RUNBOOK_TITLE_SUFFIX = "执行手册";
const VALID_TEMPLATE_BASENAMES = new Set(["runbook-template.md"]);
const RUNBOOK_MODE_PLACEHOLDERS = new Set(["> 当前模式：`<coding|operation|migration>`"]);
const RUNBOOK_MODE_RE = /^> 当前模式：`(coding|operation|migration)`$/;
const STEP_SIGNED_EXEC_RE = /^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
const STEP_SIGNED_ACCEPT_RE = /^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
const RECORD_SIGNED_EXEC_RE = /^#### 执行记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
const RECORD_SIGNED_ACCEPT_RE = /^#### 验收记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
const EXTERNAL_LINK_HEADER_RE = /^\|\s*(?:name|名称)\s*\|\s*(?:type|类型)\s*\|\s*(?:link|链接)\s*\|\s*desc\s*\|\s*$/i;
const EXTERNAL_LINK_SEPARATOR_RE = /^\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*$/;
const EXTERNAL_LINK_ROW_RE = /^\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*\[[^\]]+\]\([^)]+\)\s*\|\s*[^|。！？.!?]+[。！？.!?]?\s*\|\s*$/;
const ANSWER_OPTION_SHORTHAND_RE = /^> A：\s*(?:选项\s*`?\d+`?|选\s*`?\d+`?)(?:[。；，,\s]|$)/;
const INTERVIEW_TIME_RE = /^访谈时间：\s*\S.*$/;
const QUESTION_OPTION_SLASH_RE = /^Q：.*\b\d+\s*[/／]\s*\d+(?:\s*[/／]\s*\d+)+/;
const QUESTION_OPTION_MARKER_RE = /(?:^|[\s（(])(?:\d+[.、)）:]|[A-Za-z][.、)）:]|[一二三四五六七八九十]+[、)）:])/g;
const TRANSFER_ACTION_RE = /^\s*(?:scp|sftp|rsync|kubectl\s+cp|docker\s+cp|rclone\s+copy|curl\b.*(?:-T|--upload-file))\b/gim;
const REMOTE_EXEC_ACTION_RE = /^\s*(?:ssh|ansible(?:-playbook)?|pssh|pdsh|clush|kubectl\s+exec|docker\s+exec)\b/gim;
const OPERATION_NATURE_RE = /^操作性质：\s*(只读|幂等|破坏性)\s*$/;
const OPERATION_UI = {
  "只读": ["🟢", "[!TIP]"],
  "幂等": ["🟡", "[!WARNING]"],
  "破坏性": ["🔴", "[!CAUTION]"],
};
const HOST_LOW_LEVEL_CONFIG_PATH_RE = /(?:\/etc\/(?:netplan(?:\/|$)|network(?:\/|$)|NetworkManager\/(?:system-connections|conf\.d)(?:\/|$)|sysconfig\/network-scripts(?:\/|$)|systemd\/network(?:\/|$)|fstab|crypttab|multipath(?:\.conf|\/)|lvm(?:\/|\.conf)|cgconfig\.conf|cgrules\.conf)|\/etc\/systemd\/(?:system|user)\/[^\s]*\.(?:slice|service)|\/sys\/fs\/cgroup(?:\/|$))/;
const HOST_CONFIG_WRITE_ACTION_RE = /(?:^|[|;&]\s*)(?:sudo\s+)?(?:tee|sed\s+-i|perl\s+-pi|cp|mv|rm|install|chmod|chown|truncate)\b/gim;
const HOST_CONFIG_REDIRECT_RE = />\s*(?:\S+\s+)?(?:\/etc\/|\/sys\/fs\/cgroup)/;
const HOST_LOW_LEVEL_MUTATION_RE = /^\s*(?:sudo\s+)?(?:ip\s+(?:link|addr|route|rule)\s+(?:add|del|delete|replace|set)|nmcli\s+connection\s+(?:add|modify|delete|up|down|reload)|netplan\s+(?:apply|try)|if(?:up|down)\b|brctl\s+(?:addbr|delbr|addif|delif)|ovs-vsctl\b|tc\s+qdisc\s+(?:add|del|delete|replace)|iptables(?:-legacy|-nft)?\s+(?:-[ADIFPRXN]|--append|--delete|--insert|--flush|--policy|--replace|--new-chain|--delete-chain)|nft\s+(?:add|delete|flush|insert|replace)|firewall-cmd\s+(?:--add|--remove|--reload|--permanent)|sysctl\s+-w\s+net\.|parted|fdisk|sfdisk|sgdisk|mkfs(?:\.\S+)?|wipefs|pvcreate|vgcreate|lvcreate|lvremove|lvextend|lvresize|resize2fs|xfs_growfs|mdadm\s+--create|mount|umount|swapon|swapoff|dd\b.*\bof=|systemctl\s+set-property)(?:\b|$|(?=\/))/gim;

let errorCatalogCache = null;
const INCREMENTAL_DRAFT_ERROR_CODES = new Set([
  "E020",
  "E021",
  "E040",
  "E050",
  "E030",
  "E060",
  "E061",
  "E057",
  "E058",
  "E059",
  "E068",
  "E069",
  "E076",
  "E090",
  "E091",
  "E092",
  "E094",
  "E095",
  "E100",
]);

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
    if (inFence) {
      return;
    }
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

function extractH3Blocks(lines, start, end) {
  const localH3 = parseSections(lines.slice(start, end), 3);
  return localH3.map(([localStart, title], idx) => {
    const absStart = start + localStart;
    const absEnd = idx + 1 < localH3.length ? start + localH3[idx + 1][0] : end;
    return [absStart, title, absStart, absEnd];
  });
}

function extractH4Blocks(lines, start, end) {
  const localH4 = parseSections(lines.slice(start, end), 4);
  return localH4.map(([localStart, title], idx) => {
    const absStart = start + localStart;
    const absEnd = idx + 1 < localH4.length ? start + localH4[idx + 1][0] : end;
    return [absStart, title, absStart, absEnd];
  });
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

function questionContainsOptions(questionHeading) {
  if (QUESTION_OPTION_SLASH_RE.test(questionHeading)) {
    return true;
  }
  const questionBody = questionHeading.replace(/^Q：/, "").trim();
  const matches = questionBody.match(QUESTION_OPTION_MARKER_RE);
  return matches != null && matches.length >= 2;
}

function validateH3Whitelist(lines, h2Sections) {
  const errors = [];
  for (const [h2Title, required] of Object.entries(REQUIRED_H3_BY_H2)) {
    const section = sectionSlice(h2Sections, h2Title, lines.length);
    if (section == null) {
      continue;
    }
    const [start, end] = section;
    const found = parseSections(lines.slice(start, end), 3).map(([, title]) => title);
    if (JSON.stringify(found) !== JSON.stringify(required)) {
      const lineIdx = firstNonEmptyLineIdx(lines, start + 1, end) ?? start;
      errors.push(
        err("E011", lines, lineIdx, found.length > 0 ? found.join(" / ") : "<missing>", {
          h2_title: h2Title,
          expected_order: required.join(" / "),
        }),
      );
    }
  }
  return errors;
}

function validateCurrentAndTarget(lines, h2Sections) {
  const errors = [];
  const background = sectionSlice(h2Sections, "背景与现状", lines.length);
  if (background == null) {
    return errors;
  }
  let [start, end] = background;
  let h3 = parseSections(lines.slice(start, end), 3);
  for (const title of ["现状"]) {
    const subsection = sectionSlice(h3, title, end - start);
    if (subsection == null) {
      continue;
    }
    const [localStart, localEnd] = subsection;
    const absStart = start + localStart;
    const absEnd = start + localEnd;
    const body = lines.slice(absStart, absEnd).join("\n");
    if (!body.includes("```dot")) {
      errors.push(err("E020", lines, absStart, null, { title }));
    }
    if (!body.includes('fontname="Noto Sans CJK SC"')) {
      errors.push(err("E021", lines, absStart, null, { title }));
    }
    if (body.includes("Arial")) {
      errors.push(err("E022", lines, absStart, null, { title }));
    }
  }
  const target = sectionSlice(h2Sections, "目标与非目标", lines.length);
  if (target == null) {
    return errors;
  }
  [start, end] = target;
  h3 = parseSections(lines.slice(start, end), 3);
  const subsection = sectionSlice(h3, "目标", end - start);
  if (subsection != null) {
    const [localStart, localEnd] = subsection;
    const absStart = start + localStart;
    const absEnd = start + localEnd;
    const body = lines.slice(absStart, absEnd).join("\n");
    if (!body.includes("```dot")) {
      errors.push(err("E020", lines, absStart, null, { title: "目标" }));
    }
    if (!body.includes('fontname="Noto Sans CJK SC"')) {
      errors.push(err("E021", lines, absStart, null, { title: "目标" }));
    }
    if (body.includes("Arial")) {
      errors.push(err("E022", lines, absStart, null, { title: "目标" }));
    }
  }
  return errors;
}

function validateQA(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "访谈记录", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const blocks = extractH3Blocks(lines, start + 1, end);
  const errors = [];

  if (blocks.length < 5) {
    errors.push(err("E030", lines, start));
  }

  for (const [headingIdx, title, blockStart, blockEnd] of blocks) {
    if (NUMBERED_H3_RE.test(title)) {
      errors.push(err("E032", lines, headingIdx));
    }
    if (!title.startsWith("Q：") || title === "Q：") {
      errors.push(err("E031", lines, headingIdx));
      continue;
    }
    if (questionContainsOptions(title)) {
      errors.push(err("E049", lines, headingIdx));
    }

    const body = [];
    for (let idx = blockStart + 1; idx < blockEnd; idx += 1) {
      if (lines[idx].trim()) {
        body.push([idx, lines[idx]]);
      }
    }
    if (body.length < 2) {
      errors.push(err("E033", lines, headingIdx));
      continue;
    }

    const qQuote = body.find(([_, line]) => line.startsWith("> Q："));
    if (qQuote) {
      errors.push(err("E034", lines, qQuote[0]));
    }

    const aLabelPos = body.findIndex(([_, line]) => line.startsWith("> A："));
    if (aLabelPos === -1) {
      errors.push(err("E036", lines, headingIdx));
      continue;
    }

    const [aLabelIdx, aLabel] = body[aLabelPos];
    if (aLabel === "> A：") {
      errors.push(err("E037", lines, aLabelIdx));
    }
    if (ANSWER_OPTION_SHORTHAND_RE.test(aLabel)) {
      errors.push(err("E039", lines, aLabelIdx));
    }

    const bodyLines = body
      .slice(aLabelPos + 1)
      .filter(([_, line]) => line.trim() && !line.startsWith(">"));
    const interviewTimeLines = bodyLines.filter(([_, line]) => line.startsWith("访谈时间："));
    if (interviewTimeLines.length === 0) {
      errors.push(err("E053", lines, headingIdx));
    }
    if (interviewTimeLines.some(([_, line]) => !INTERVIEW_TIME_RE.test(line))) {
      errors.push(err("E053", lines, interviewTimeLines[0][0]));
    }
    if (interviewTimeLines.length > 1) {
      errors.push(err("E054", lines, interviewTimeLines[1][0]));
    }
    if (interviewTimeLines.length > 0 && bodyLines.length > 0 && bodyLines[0][1] !== interviewTimeLines[0][1]) {
      errors.push(err("E055", lines, interviewTimeLines[0][0]));
    }

    const impactLines = bodyLines.filter(([_, line]) => !line.startsWith("访谈时间："));
    if (interviewTimeLines.length > 0 && impactLines.length > 0) {
      const interviewTimeIdx = interviewTimeLines[0][0];
      if (interviewTimeIdx + 1 < lines.length && lines[interviewTimeIdx + 1].trim()) {
        errors.push(err("E056", lines, interviewTimeIdx));
      }
    }
    if (impactLines.length === 0) {
      errors.push(err("E033", lines, headingIdx));
    }
    if (impactLines.some(([_, line]) => line === "收敛影响：")) {
      errors.push(err("E038", lines, headingIdx));
    }
  }

  return errors;
}

function validateMindmap(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "思维脑图", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const dotBlock = extractDotBlock(lines, start + 1, end);
  if (dotBlock == null) {
    return [err("E040", lines, start)];
  }
  const [blockStart, _blockEnd, dotLines] = dotBlock;
  const dotText = dotLines.join("\n");
  if (!dotText.includes('fontname="Noto Sans CJK SC"')) {
    return [err("E047", lines, blockStart)];
  }
  if (dotText.includes("Arial")) {
    return [err("E048", lines, blockStart)];
  }

  const edgeRe = /^\s*([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)/;
  const children = new Map();
  const indegree = new Map();
  const outdegree = new Map();
  let edgeCount = 0;

  for (const raw of dotLines) {
    const match = raw.match(edgeRe);
    if (!match) {
      continue;
    }
    const [, src, dst] = match;
    edgeCount += 1;
    if (!children.has(src)) children.set(src, []);
    if (!children.has(dst)) children.set(dst, []);
    children.get(src).push(dst);
    indegree.set(dst, (indegree.get(dst) ?? 0) + 1);
    if (!indegree.has(src)) indegree.set(src, 0);
    outdegree.set(src, (outdegree.get(src) ?? 0) + 1);
    if (!outdegree.has(dst)) outdegree.set(dst, 0);
  }

  if (edgeCount === 0) {
    return [err("E041", lines, blockStart)];
  }

  const nodes = new Set([...children.keys(), ...indegree.keys(), ...outdegree.keys()]);
  const roots = [...nodes].filter((node) => (indegree.get(node) ?? 0) === 0);
  if (roots.length !== 1) {
    return [err("E042", lines, blockStart)];
  }

  const categories = children.get(roots[0]) ?? [];
  if (categories.length < 3) {
    return [err("E043", lines, blockStart)];
  }

  const errors = [];
  for (const category of categories) {
    const leaves = children.get(category) ?? [];
    if (leaves.length < 2) {
      errors.push(err("E044", lines, blockStart, category));
    }
    if (leaves.length > 3) {
      errors.push(err("E045", lines, blockStart, category));
    }
    for (const leaf of leaves) {
      if ((outdegree.get(leaf) ?? 0) !== 0) {
        errors.push(err("E046", lines, blockStart, leaf));
      }
    }
  }
  return errors;
}

function validateRedlines(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "红线行为", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  if (parseSections(lines.slice(start + 1, end), 3).length > 0) {
    return [err("E051", lines, start)];
  }
  let bulletCount = 0;
  for (let idx = start + 1; idx < end; idx += 1) {
    if (lines[idx].trim().startsWith("- ")) {
      bulletCount += 1;
    }
  }
  if (bulletCount === 0) {
    return [err("E050", lines, start)];
  }
  return [];
}

function validateCleanupSection(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "清理现场", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const body = lines.slice(start, end).join("\n");
  const errors = [];
  if (parseSections(lines.slice(start + 1, end), 3).length > 0) {
    errors.push(err("E052", lines, start));
  }
  for (const [label, code] of [
    ["清理触发条件：", "E057"],
    ["清理命令：", "E058"],
    ["清理完成条件：", "E059"],
    ["恢复执行入口：", "E068"],
  ]) {
    if (!body.includes(label)) {
      errors.push(err(code, lines, start, null, { label }));
    }
  }
  if (!body.includes("```")) {
    errors.push(err("E069", lines, start));
  }
  return errors;
}

function parseNumberedSteps(lines, steps, sectionName) {
  const entries = [];
  const errors = [];
  let expected = 1;

  for (const [headingIdx, title] of steps) {
    const match = title.match(NUMBERED_H3_RE);
    if (!match) {
      errors.push(err("E064", lines, headingIdx, null, { section_name: sectionName }));
      continue;
    }
    const actual = Number(match[1]);
    const label = match[2];
    if (actual !== expected) {
      errors.push(err("E065", lines, headingIdx, null, { section_name: sectionName, expected, actual }));
      expected = actual;
    }
    expected += 1;
    entries.push([headingIdx, actual, label]);
  }
  return { entries, errors };
}

function natureValuesInBlock(natureLines) {
  const values = new Set();
  for (const [, natureLine] of natureLines) {
    const match = natureLine.match(OPERATION_NATURE_RE);
    if (match) {
      values.add(match[1]);
    }
  }
  return values;
}

function mixesCrossMachineTransferAndExec(blockText) {
  return TRANSFER_ACTION_RE.test(blockText) && REMOTE_EXEC_ACTION_RE.test(blockText);
}

function modifiesHostLowLevelConfig(blockText) {
  if (HOST_LOW_LEVEL_MUTATION_RE.test(blockText)) {
    return true;
  }
  for (const line of blockText.split("\n")) {
    if (!HOST_LOW_LEVEL_CONFIG_PATH_RE.test(line)) {
      continue;
    }
    if (HOST_CONFIG_WRITE_ACTION_RE.test(line) || HOST_CONFIG_REDIRECT_RE.test(line)) {
      return true;
    }
  }
  return false;
}

function validatePlanStep(lines, title, headingIdx, start, end, index) {
  const errors = [];
  const execNatures = [];
  const h4Blocks = extractH4Blocks(lines, start + 1, end);
  const h4Titles = h4Blocks.map(([, name]) => name);

  if (!h4Titles.includes("执行") && !h4Titles.some((name) => STEP_SIGNED_EXEC_RE.test(`#### ${name}`))) {
    errors.push(err("E070", lines, headingIdx, null, { title }));
  }
  if (!h4Titles.includes("验收") && !h4Titles.some((name) => STEP_SIGNED_ACCEPT_RE.test(`#### ${name}`))) {
    errors.push(err("E071", lines, headingIdx, null, { title }));
  }

  for (const [, h4Title, blockStart, blockEnd] of h4Blocks) {
    if (
      !["执行", "验收"].includes(h4Title) &&
      !STEP_SIGNED_EXEC_RE.test(`#### ${h4Title}`) &&
      !STEP_SIGNED_ACCEPT_RE.test(`#### ${h4Title}`)
    ) {
      errors.push(err("E072", lines, blockStart, null, { title }));
      continue;
    }
    const blockText = lines.slice(blockStart, blockEnd).join("\n");
    const isExecBlock = h4Title === "执行" || STEP_SIGNED_EXEC_RE.test(`#### ${h4Title}`);
    const isAcceptBlock = h4Title === "验收" || STEP_SIGNED_ACCEPT_RE.test(`#### ${h4Title}`);
    if (!blockText.includes("```")) {
      errors.push(err("E073", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (!blockText.includes("预期结果：")) {
      errors.push(err("E074", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (!blockText.includes("停止条件：")) {
      errors.push(err("E075", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (isExecBlock && mixesCrossMachineTransferAndExec(blockText)) {
      errors.push(err("E089", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (isExecBlock) {
      const natureLines = [];
      for (let idx = blockStart; idx < blockEnd; idx += 1) {
        if (lines[idx].trim().startsWith("操作性质：")) {
          natureLines.push([idx, lines[idx].trim()]);
        }
      }
      if (natureLines.length === 0) {
        errors.push(err("E096", lines, blockStart, null, { title }));
      }
      for (const [natureIdx, natureLine] of natureLines) {
        const match = natureLine.match(OPERATION_NATURE_RE);
        if (!match) {
          errors.push(err("E096", lines, natureIdx, null, { title }));
          continue;
        }
        const nature = match[1];
        execNatures.push([natureIdx, nature]);
        const [expectedEmoji, expectedAlert] = OPERATION_UI[nature];
        const preExecText = lines.slice(start + 1, blockStart).join("\n");
        if (!title.startsWith(`${expectedEmoji} `)) {
          errors.push(err("E099", lines, headingIdx, null, { title }));
        }
        if (!preExecText.includes(expectedAlert)) {
          errors.push(err("E102", lines, headingIdx, null, { title }));
        }
        if (nature === "破坏性" && (!preExecText.includes("严重后果：") || preExecText.split("[!CAUTION]").length - 1 < 2)) {
          errors.push(err("E103", lines, headingIdx, null, { title }));
        }
      }
      if (modifiesHostLowLevelConfig(blockText) && !natureValuesInBlock(natureLines).has("破坏性")) {
        errors.push(err("E104", lines, blockStart, null, { title }));
      }
    }
    const expectedLink = isExecBlock
      ? `[跳转到执行记录](#item-${index}-execution-record)`
      : `[跳转到验收记录](#item-${index}-acceptance-record)`;
    const disallowedLink = isExecBlock
      ? `[跳转到验收记录](#item-${index}-acceptance-record)`
      : `[跳转到执行记录](#item-${index}-execution-record)`;
    const expectedCount = blockText.split(expectedLink).length - 1;
    if (expectedCount === 0) {
      errors.push(err("E077", lines, blockStart, null, { title, h4_title: h4Title }));
    } else if (expectedCount !== 1) {
      errors.push(err("E078", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (blockText.includes(disallowedLink)) {
      errors.push(err("E079", lines, blockStart, null, { title, h4_title: h4Title }));
    }
    if (!isExecBlock && !isAcceptBlock) {
      continue;
    }
  }
  const natureValues = new Set(execNatures.map(([, nature]) => nature));
  if (natureValues.size > 1) {
    errors.push(err("E097", lines, execNatures[0][0], null, { title }));
  }
  return errors;
}

function destructivePlanItems(lines, h2Sections) {
  const plan = sectionSlice(h2Sections, "执行计划", lines.length);
  if (plan == null) {
    return [];
  }
  const items = [];
  for (const [headingIdx, title, blockStart, blockEnd] of extractH3Blocks(lines, plan[0] + 1, plan[1])) {
    const match = title.match(NUMBERED_H3_RE);
    if (!match) {
      continue;
    }
    const h4Blocks = extractH4Blocks(lines, blockStart + 1, blockEnd);
    for (const [, h4Title, h4Start, h4End] of h4Blocks) {
      const isExecBlock = h4Title === "执行" || STEP_SIGNED_EXEC_RE.test(`#### ${h4Title}`);
      if (!isExecBlock) {
        continue;
      }
      const blockText = lines.slice(h4Start, h4End).join("\n");
      if (/^操作性质：\s*破坏性\s*$/m.test(blockText)) {
        items.push([Number(match[1]), title, headingIdx]);
        break;
      }
    }
  }
  return items;
}

function validateRecordStep(lines, title, headingIdx, start, end, index) {
  const errors = [];
  const blockText = lines.slice(start, end).join("\n");
  if (!blockText.includes(`<a id="item-${index}-execution-record"></a>`)) {
    errors.push(err("E080", lines, headingIdx, null, { title }));
  }
  if (!blockText.includes(`<a id="item-${index}-acceptance-record"></a>`)) {
    errors.push(err("E081", lines, headingIdx, null, { title }));
  }

  const h4Blocks = extractH4Blocks(lines, start + 1, end);
  const h4Titles = h4Blocks.map(([, name]) => name);
  if (!h4Titles.some((name) => name === "执行记录" || RECORD_SIGNED_EXEC_RE.test(`#### ${name}`))) {
    errors.push(err("E082", lines, headingIdx, null, { title }));
  }
  if (!h4Titles.some((name) => name === "验收记录" || RECORD_SIGNED_ACCEPT_RE.test(`#### ${name}`))) {
    errors.push(err("E083", lines, headingIdx, null, { title }));
  }

  for (const [, h4Title, blockStart, blockEnd] of h4Blocks) {
    const fullH4 = `#### ${h4Title}`;
    if (
      !["执行记录", "验收记录"].includes(h4Title) &&
      !RECORD_SIGNED_EXEC_RE.test(fullH4) &&
      !RECORD_SIGNED_ACCEPT_RE.test(fullH4)
    ) {
      errors.push(err("E084", lines, blockStart, null, { title }));
      continue;
    }
    const body = lines.slice(blockStart, blockEnd).join("\n");
    if (
      (h4Title.includes("执行记录") && !body.includes("执行命令：")) ||
      (h4Title.includes("执行记录") && !body.includes("执行结果：")) ||
      (h4Title.includes("执行记录") && !body.includes("执行结论："))
    ) {
      errors.push(err("E085", lines, blockStart, null, { title }));
    }
    if (
      (h4Title.includes("验收记录") && !body.includes("验收命令：")) ||
      (h4Title.includes("验收记录") && !body.includes("验收结果：")) ||
      (h4Title.includes("验收记录") && !body.includes("验收结论："))
    ) {
      errors.push(err("E086", lines, blockStart, null, { title }));
    }
    if (!body.includes("```")) {
      errors.push(err("E087", lines, blockStart, null, { title }));
    }
    if (h4Title.includes("@") && (body.includes("待执行") || body.includes("待验收"))) {
      errors.push(err("E088", lines, blockStart, null, { title }));
    }
  }
  return errors;
}

function validateFinalAcceptance(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "最终验收", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const body = lines.slice(start, end).join("\n");
  const errors = [];
  for (const [label, code] of [
    ["最终验收命令：", "E090"],
    ["最终验收结果：", "E091"],
    ["最终验收结论：", "E092"],
  ]) {
    if (!body.includes(label)) {
      errors.push(err(code, lines, start, null, { label }));
    }
  }
  if (!body.includes("- [ ]") && !body.includes("- [x]")) {
    errors.push(err("E076", lines, start));
  }
  return errors;
}

function validateRollbackPlan(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "回滚方案", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const body = lines.slice(start, end).join("\n");
  const errors = [];
  if (parseSections(lines.slice(start + 1, end), 3).length > 0) {
    errors.push(err("E093", lines, start));
  }
  if (!body.includes("回滚")) {
    errors.push(err("E094", lines, start));
  }
  if (!body.includes("```")) {
    errors.push(err("E095", lines, start));
  }
  for (const [itemNo, title, headingIdx] of destructivePlanItems(lines, h2Sections)) {
    if (!new RegExp(`^\\s*${itemNo}\\.\\s+\\S`, "m").test(body)) {
      errors.push(err("E098", lines, headingIdx, null, { title, item: itemNo }));
    }
  }
  return errors;
}

function validateExternalLinks(lines, h2Sections) {
  const section = sectionSlice(h2Sections, "外部链接", lines.length);
  if (section == null) {
    return [];
  }
  const [start, end] = section;
  const entries = [];
  for (let idx = start + 1; idx < end; idx += 1) {
    if (lines[idx].trim()) {
      entries.push([idx, lines[idx].trim()]);
    }
  }
  if (entries.length === 0) {
    return [err("E100", lines, start)];
  }
  const errors = [];
  if (entries.length < 3) {
    return [err("E101", lines, start)];
  }
  if (!EXTERNAL_LINK_HEADER_RE.test(entries[0][1])) {
    errors.push(err("E101", lines, entries[0][0]));
  }
  if (!EXTERNAL_LINK_SEPARATOR_RE.test(entries[1][1])) {
    errors.push(err("E101", lines, entries[1][0]));
  }
  for (const [idx, entry] of entries.slice(2)) {
    if (!EXTERNAL_LINK_ROW_RE.test(entry)) {
      errors.push(err("E101", lines, idx));
    }
  }
  return errors;
}

function validatePlanAndRecords(lines, h2Sections) {
  const errors = [];
  const plan = sectionSlice(h2Sections, "执行计划", lines.length);
  const records = sectionSlice(h2Sections, "执行记录", lines.length);
  if (plan == null || records == null) {
    return errors;
  }

  const planSteps = extractH3Blocks(lines, plan[0] + 1, plan[1]);
  const recordSteps = extractH3Blocks(lines, records[0] + 1, records[1]);

  if (planSteps.length === 0) {
    errors.push(err("E060", lines, plan[0]));
  }
  if (recordSteps.length === 0) {
    errors.push(err("E061", lines, records[0]));
  }

  const planTitles = planSteps.map(([, title]) => title);
  const recordTitles = recordSteps.map(([, title]) => title);
  if (JSON.stringify(planTitles) !== JSON.stringify(recordTitles)) {
    errors.push(err("E062", lines, records[0], `plan=${planTitles.join("|")} record=${recordTitles.join("|")}`));
  }

  const planNumbered = parseNumberedSteps(lines, planSteps, "执行计划");
  const recordNumbered = parseNumberedSteps(lines, recordSteps, "执行记录");
  errors.push(...planNumbered.errors, ...recordNumbered.errors);

  if (planNumbered.entries.length > 0 && recordNumbered.entries.length > 0) {
    if (planNumbered.entries.length !== recordNumbered.entries.length) {
      errors.push(err("E066", lines, records[0]));
    } else {
      for (let idx = 0; idx < planNumbered.entries.length; idx += 1) {
        const [, planNo, planLabel] = planNumbered.entries[idx];
        const [recordHeadingIdx, recordNo, recordLabel] = recordNumbered.entries[idx];
        if (planNo !== recordNo || planLabel !== recordLabel) {
          errors.push(err("E067", lines, recordHeadingIdx, `plan=${planNo}. ${planLabel} record=${recordNo}. ${recordLabel}`));
          break;
        }
      }
    }
  }

  planSteps.forEach(([headingIdx, title, blockStart, blockEnd], index) => {
    errors.push(...validatePlanStep(lines, title, headingIdx, blockStart, blockEnd, index + 1));
  });
  recordSteps.forEach(([headingIdx, title, blockStart, blockEnd], index) => {
    errors.push(...validateRecordStep(lines, title, headingIdx, blockStart, blockEnd, index + 1));
  });

  return errors;
}

function collectErrorsCore(text, pathValue = null) {
  const lines = text.split(/\r?\n/);
  const errors = [];
  const templateBasename = pathValue == null ? null : path.basename(pathValue);

  if (lines.length === 0 || !lines[0].startsWith("# ")) {
    errors.push(err("E001", lines, lines.length > 0 ? 0 : null));
    return errors;
  }
  if (DATE_TOKEN_RE.test(lines[0])) {
    errors.push(err("E105", lines, 0));
  }
  if (lines[0].trim() !== "# <主题>执行手册" && !lines[0].trim().slice(2).endsWith(RUNBOOK_TITLE_SUFFIX)) {
    errors.push(err("E107", lines, 0, null, { suffix: RUNBOOK_TITLE_SUFFIX }));
  }
  const noteIdx = firstNonEmptyLineIdx(lines, 1, lines.length);
  if (noteIdx == null || lines[noteIdx].trim() !== "> [!NOTE]") {
    errors.push(err("E109", lines, noteIdx));
  }
  const modeIdx = noteIdx == null ? null : firstNonEmptyLineIdx(lines, noteIdx + 1, lines.length);
  if (
    modeIdx == null ||
    (!RUNBOOK_MODE_PLACEHOLDERS.has(lines[modeIdx].trim()) && !RUNBOOK_MODE_RE.test(lines[modeIdx].trim()))
  ) {
    errors.push(err("E110", lines, modeIdx));
  }
  if (pathValue != null && DATE_TOKEN_RE.test(path.basename(pathValue))) {
    errors.push({
      code: "E106",
      message: errorMessage("E106"),
      line: null,
      content: path.basename(pathValue),
    });
  }
  if (pathValue != null && !VALID_TEMPLATE_BASENAMES.has(path.basename(pathValue)) && !path.basename(pathValue).endsWith(RUNBOOK_FILENAME_SUFFIX)) {
    errors.push({
      code: "E108",
      message: errorMessage("E108", { suffix: RUNBOOK_FILENAME_SUFFIX }),
      line: null,
      content: path.basename(pathValue),
    });
  }

  let inFence = false;
  lines.forEach((line, idx) => {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
    }
    if (inFence) {
      return;
    }
    if (FORBIDDEN_H2.has(line.trim().slice(3)) && line.trim().startsWith("## ")) {
      errors.push(err("E002", lines, idx, null, { title: line.trim().slice(3) }));
    }
    if (FORBIDDEN_H3.has(line.trim().slice(4)) && line.trim().startsWith("### ")) {
      errors.push(err("E003", lines, idx, null, { title: line.trim().slice(4) }));
    }
  });

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
    errors.push(
      err(
        "E010",
        lines,
        lineIdx,
        h2Titles.length > 0 ? h2Titles.join(" / ") : "<missing>",
        { expected_order: REQUIRED_H2.join(" / ") },
      ),
    );
  }

  errors.push(
    ...validateH3Whitelist(lines, h2Sections),
    ...validateCurrentAndTarget(lines, h2Sections),
    ...validateQA(lines, h2Sections),
    ...validateMindmap(lines, h2Sections),
    ...validateRedlines(lines, h2Sections),
    ...validateCleanupSection(lines, h2Sections),
    ...validatePlanAndRecords(lines, h2Sections),
    ...validateFinalAcceptance(lines, h2Sections),
    ...validateRollbackPlan(lines, h2Sections),
    ...validateExternalLinks(lines, h2Sections),
  );

  return errors;
}

export function collectErrors(text, pathValue = null) {
  return collectErrorsCore(normalizeRunbookNumbering(text), pathValue);
}

export function filterIncrementalDraftErrors(errors) {
  return errors.filter((item) => !INCREMENTAL_DRAFT_ERROR_CODES.has(item.code));
}

function buildNaturalLanguageSummary(errors) {
  const summary = [`本次扫描共发现 ${errors.length} 个问题，当前 runbook 还不能进入执行态`];
  errors.forEach((item, index) => {
    const location = item.line == null ? "某处" : `第 ${item.line} 行`;
    let detail = `${location}需要修正：${item.message}`;
    if (item.content) {
      detail += ` 当前命中的内容是：${item.content}`;
    }
    summary.push(`${index + 1}. ${detail}`);
  });
  summary.push("请先按以上问题修正文档，再重新运行 runctl validate");
  return summary;
}

export function printPass(filePath, jsonMode = false) {
  if (jsonMode) {
    console.log(JSON.stringify({ status: "pass", path: `${filePath}`, errors: [] }, null, 2));
    return;
  }
  console.log(`[runbook-validator] PASS ${filePath}`);
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
  console.log(`[runbook-validator] FAIL ${filePath}`);
  errors.forEach((item) => {
    const location = item.line == null ? "" : ` line ${item.line}`;
    console.log(`- ${item.code}${location}: ${item.message}`);
    if (item.content) {
      console.log(`  content: ${item.content}`);
    }
  });
  console.log("\n[runbook-validator] 自然语言总结");
  summary.forEach((line) => {
    console.log(`- ${line}`);
  });
}

export async function handleValidate(args) {
  const filePath = path.resolve(args.path);
  if (!fs.existsSync(filePath)) {
    printFail(filePath, [{ code: "E000", message: errorMessage("E000", { path: filePath }), line: null, content: null }], args.json);
    return 2;
  }
  const { normalized } = await normalizeFile(filePath);
  const errors = collectErrorsCore(normalized, filePath);
  if (errors.length > 0) {
    printFail(filePath, errors, args.json);
    return 1;
  }
  printPass(filePath, args.json);
  return 0;
}

export function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--stdin-json")) {
    console.error("usage: node validate.mjs --stdin-json");
    process.exit(2);
  }

  const input = fs.readFileSync(0, "utf8");
  const payload = input.trim() ? JSON.parse(input) : {};
  const text = typeof payload.text === "string" ? payload.text : "";
  const pathValue = typeof payload.path === "string" && payload.path ? path.resolve(payload.path) : null;
  const errors = collectErrorsCore(text, pathValue);
  process.stdout.write(JSON.stringify({ errors }, null, 2));
}

export { RECORD_SIGNED_EXEC_RE, RECORD_SIGNED_ACCEPT_RE };

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  }
}
