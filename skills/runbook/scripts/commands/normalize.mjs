import path from "node:path";
import { promises as fs } from "node:fs";
import { splitLinesKeepEnds } from "./shared.mjs";

export const NUMBERED_H3_RE = /^(?:[🟢🟡🔴]\s+)?(\d+)\. (.+)$/u;
export const STEP_TRAFFIC_LIGHT_RE = /^([🟢🟡🔴]\s+)/u;
export const STEP_SIGNED_EXEC_RE = /^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
export const STEP_SIGNED_ACCEPT_RE = /^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
export const PLAN_JUMP_LINK_RE = /^\[跳转到(?:执行|验收)记录\]\(#item-\d+-(?:execution|acceptance)-record\)$/;
export const ITEM_TOKEN_RE = /item-(\d+)(-execution-record|-acceptance-record)?/g;

export function parseSections(lines, level) {
  const prefix = `${"#".repeat(level)} `;
  const result = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    if (lines[idx].startsWith(prefix)) {
      result.push([idx, lines[idx].slice(prefix.length).trim()]);
    }
  }
  return result;
}

export function sectionSlice(sections, title, linesLen) {
  for (let i = 0; i < sections.length; i += 1) {
    const [start, name] = sections[i];
    if (name === title) {
      const end = i + 1 < sections.length ? sections[i + 1][0] : linesLen;
      return [start, end];
    }
  }
  return null;
}

export function extractH3Blocks(lines, start, end) {
  const localH3 = parseSections(lines.slice(start, end), 3);
  return localH3.map(([localStart, title], index) => {
    const absStart = start + localStart;
    const absEnd = index + 1 < localH3.length ? start + localH3[index + 1][0] : end;
    return [absStart, title, absStart, absEnd];
  });
}

export function extractH4Blocks(lines, start, end) {
  const localH4 = parseSections(lines.slice(start, end), 4);
  return localH4.map(([localStart, title], index) => {
    const absStart = start + localStart;
    const absEnd = index + 1 < localH4.length ? start + localH4[index + 1][0] : end;
    return [absStart, title, absStart, absEnd];
  });
}

function replaceItemNumberTokens(line, oldNumber, newNumber) {
  return line.replace(ITEM_TOKEN_RE, (full, number, suffix = "") => {
    if (Number(number) !== oldNumber) {
      return full;
    }
    return `item-${newNumber}${suffix}`;
  });
}

function normalizeNumberedStepSection(lines, sectionName, { fixItemTokens }) {
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, sectionName, lines.length);
  if (!section) {
    return new Map();
  }

  const [sectionStart, sectionEnd] = section;
  let expected = 1;
  const mapping = new Map();
  for (const [headingIdx, title, blockStart, blockEnd] of extractH3Blocks(lines, sectionStart + 1, sectionEnd)) {
    const match = title.match(NUMBERED_H3_RE);
    if (!match) {
      continue;
    }

    const actual = Number(match[1]);
    const label = match[2];
    mapping.set(actual, expected);
    const trafficLight = title.match(STEP_TRAFFIC_LIGHT_RE);
    const titlePrefix = trafficLight ? trafficLight[1] : "";
    const newline = lines[headingIdx].endsWith("\n") ? "\n" : "";
    lines[headingIdx] = `### ${titlePrefix}${expected}. ${label}${newline}`;

    if (fixItemTokens && actual !== expected) {
      let anchorIdx = headingIdx - 1;
      while (anchorIdx > sectionStart && !lines[anchorIdx].trim()) {
        anchorIdx -= 1;
      }
      if (anchorIdx > sectionStart) {
        lines[anchorIdx] = replaceItemNumberTokens(lines[anchorIdx], actual, expected);
      }
      for (let idx = blockStart + 1; idx < blockEnd; idx += 1) {
        lines[idx] = replaceItemNumberTokens(lines[idx], actual, expected);
      }
    }
    expected += 1;
  }
  return mapping;
}

function normalizeRollbackItemNumbers(lines, mapping) {
  if (!mapping.size) {
    return;
  }

  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, "回滚方案", lines.length);
  if (!section) {
    return;
  }

  const [start, end] = section;
  for (let idx = start + 1; idx < end; idx += 1) {
    const match = lines[idx].match(/^(\s*)(\d+)(\.\s+.*?)(\n?)$/);
    if (!match) {
      continue;
    }
    const oldNumber = Number(match[2]);
    const newNumber = mapping.get(oldNumber);
    if (!newNumber || newNumber === oldNumber) {
      continue;
    }
    lines[idx] = `${match[1]}${newNumber}${match[3]}${match[4]}`;
    lines[idx] = replaceItemNumberTokens(lines[idx], oldNumber, newNumber);
  }
}

function normalizePlanJumpLinks(lines) {
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, "执行计划", lines.length);
  if (!section) {
    return;
  }

  const stepBlocks = extractH3Blocks(lines, section[0] + 1, section[1]);
  for (let i = stepBlocks.length - 1; i >= 0; i -= 1) {
    const stepIndex = i + 1;
    const [, , stepStart, stepEnd] = stepBlocks[i];
    const h4Blocks = extractH4Blocks(lines, stepStart + 1, stepEnd);
    for (let j = h4Blocks.length - 1; j >= 0; j -= 1) {
      const [, h4Title, blockStart, blockEnd] = h4Blocks[j];
      const isExecBlock = h4Title === "执行" || STEP_SIGNED_EXEC_RE.test(`#### ${h4Title}`);
      const isAcceptBlock = h4Title === "验收" || STEP_SIGNED_ACCEPT_RE.test(`#### ${h4Title}`);
      if (!isExecBlock && !isAcceptBlock) {
        continue;
      }

      const expectedLink = isExecBlock
        ? `[跳转到执行记录](#item-${stepIndex}-execution-record)`
        : `[跳转到验收记录](#item-${stepIndex}-acceptance-record)`;

      const bodyLines = lines
        .slice(blockStart + 1, blockEnd)
        .filter((line) => !PLAN_JUMP_LINK_RE.test(line.trim()));
      while (bodyLines.length > 0 && !bodyLines[0].trim()) {
        bodyLines.shift();
      }
      lines.splice(blockStart + 1, blockEnd - blockStart - 1, "\n", `${expectedLink}\n`, "\n", ...bodyLines);
    }
  }
}

export function normalizeRunbookNumbering(text) {
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0) {
    return text;
  }

  const planMapping = normalizeNumberedStepSection(lines, "执行计划", { fixItemTokens: true });
  normalizeRollbackItemNumbers(lines, planMapping);
  normalizeNumberedStepSection(lines, "执行记录", { fixItemTokens: true });
  normalizePlanJumpLinks(lines);
  return lines.join("");
}

export async function normalizeFile(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  const normalized = normalizeRunbookNumbering(source);
  const changed = normalized !== source;
  if (changed) {
    await fs.writeFile(filePath, normalized, "utf8");
  }
  return { source, normalized, changed };
}

export async function handleNormalize(args) {
  const { changed } = await normalizeFile(path.resolve(args.path));
  const status = changed ? "updated" : "unchanged";
  console.log(`[runbook-normalize] ${status} ${path.resolve(args.path)}`);
  return 0;
}
