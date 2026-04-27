import path from "node:path";
import { promises as fs } from "node:fs";
import { splitLinesKeepEnds } from "./shared.mjs";
import { NUMBERED_H3_RE, extractH3Blocks, extractH4Blocks, normalizeFile, parseSections, sectionSlice } from "./normalize.mjs";
import { collectErrors, filterIncrementalDraftErrors, printFail } from "./validate.mjs";

const TRAFFIC_PREFIXES = ["🟢 ", "🟡 ", "🔴 "];
const NUMBERED_TITLE_RE = /^\d+\.\s+(.+)$/;

export function cleanTitle(rawTitle) {
  let title = rawTitle.trim();
  if (!title || title.includes("\n")) {
    throw new Error("`--title` must be a single non-empty line");
  }
  const match = title.match(NUMBERED_TITLE_RE);
  if (match) {
    title = match[1].trim();
  }
  return title;
}

function extractItemBlocks(lines, sectionName) {
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, sectionName, lines.length);
  if (!section) {
    throw new Error(`missing \`## ${sectionName}\` section`);
  }
  const blocks = [];
  for (const [headingIdx, title, blockStart, blockEnd] of extractH3Blocks(lines, section[0] + 1, section[1])) {
    const match = title.match(NUMBERED_H3_RE);
    if (!match) {
      continue;
    }
    const h4Blocks = extractH4Blocks(lines, blockStart + 1, blockEnd);
    const contentEnd = h4Blocks.length > 0 ? h4Blocks[h4Blocks.length - 1][3] : blockEnd;
    blocks.push({
      number: Number(match[1]),
      label: match[2],
      headingIdx,
      blockStart,
      blockEnd,
      contentEnd,
    });
  }
  return [section, blocks];
}

function firstItemInsertIndex(lines, section) {
  const [sectionStart, sectionEnd] = section;
  for (let idx = sectionStart + 1; idx < sectionEnd; idx += 1) {
    if (lines[idx].trim().startsWith("- ")) {
      return idx;
    }
  }
  return sectionEnd;
}

function insertionIndex(blocks, after) {
  if (after < 0) {
    throw new Error("`--after` must be >= 0");
  }
  if (after === 0) {
    return blocks.length > 0 ? [blocks[0].blockStart, 1] : [0, 1];
  }
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const block = blocks[idx];
    if (block.number !== after) {
      continue;
    }
    const provisionalNumber = after + 1;
    if (idx === blocks.length - 1) {
      return [block.contentEnd, provisionalNumber];
    }
    return [block.blockEnd, provisionalNumber];
  }
  throw new Error(`\`--after ${after}\` does not match an existing item; available numbers: ${blocks.map((item) => item.number).join(", ")}`);
}

function buildPlanStep(number, title) {
  const trafficLight = TRAFFIC_PREFIXES.find((prefix) => title.startsWith(prefix)) ?? "🟡 ";
  const clean = TRAFFIC_PREFIXES.some((prefix) => title.startsWith(prefix)) ? title.slice(2) : title;
  return `\n<a id="item-${number}"></a>\n\n### ${trafficLight}${number}. ${clean}\n\n> [!WARNING]\n> 本步骤以幂等方式执行：${clean}。\n\n#### 执行\n\n[跳转到执行记录](#item-${number}-execution-record)\n\n操作性质：幂等\n\n执行分组：<执行分组标题>\n\n\`\`\`bash\n...\n\`\`\`\n\n预期结果：\n\n- <预期状态变化或产物>\n\n停止条件：\n\n- <失败条件>\n- <若命中停止条件或出现新的事实，必须回规划态>\n\n#### 验收\n\n[跳转到验收记录](#item-${number}-acceptance-record)\n\n验收命令：\n\n\`\`\`bash\n...\n\`\`\`\n\n预期结果：\n\n- <通过证据>\n\n停止条件：\n\n- <验收失败条件>\n- <若验收失败或出现新 blocker，不得直接续跑下一项>\n`;
}

function buildRecordStep(number, title) {
  const trafficLight = TRAFFIC_PREFIXES.find((prefix) => title.startsWith(prefix)) ?? "🟡 ";
  const clean = TRAFFIC_PREFIXES.some((prefix) => title.startsWith(prefix)) ? title.slice(2) : title;
  return `\n### ${trafficLight}${number}. ${clean}\n\n<a id="item-${number}-execution-record"></a>\n\n#### 执行记录\n\n执行命令：\n\n\`\`\`bash\n...\n\`\`\`\n\n执行结果：\n\n\`\`\`text\n...\n\`\`\`\n\n执行结论：\n\n- 待执行\n\n<a id="item-${number}-acceptance-record"></a>\n\n#### 验收记录\n\n验收命令：\n\n\`\`\`bash\n...\n\`\`\`\n\n验收结果：\n\n\`\`\`text\n...\n\`\`\`\n\n验收结论：\n\n- 待执行\n`;
}

export function addStep(text, title, after = null) {
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  const [, planBlocks] = extractItemBlocks(lines, "执行计划");
  const [, recordBlocks] = extractItemBlocks(lines, "执行记录");
  if (JSON.stringify(planBlocks.map((item) => item.label)) !== JSON.stringify(recordBlocks.map((item) => item.label))) {
    throw new Error("`## 执行计划` and `## 执行记录` are not aligned; add-step aborted");
  }
  const [planSection] = extractItemBlocks(lines, "执行计划");
  const [recordSection] = extractItemBlocks(lines, "执行记录");
  let planInsertAt;
  let recordInsertAt;
  let provisionalNumber;
  let targetAfter = after;
  if (planBlocks.length === 0 && recordBlocks.length === 0) {
    if (![null, 0].includes(after)) {
      throw new Error("`--after` must be omitted or set to 0 when no numbered items exist yet");
    }
    planInsertAt = firstItemInsertIndex(lines, planSection);
    recordInsertAt = firstItemInsertIndex(lines, recordSection);
    provisionalNumber = 1;
  } else {
    targetAfter = after ?? planBlocks[planBlocks.length - 1].number;
    [planInsertAt, provisionalNumber] = insertionIndex(planBlocks, targetAfter);
    [recordInsertAt] = insertionIndex(recordBlocks, targetAfter);
  }
  let updated = `${lines.slice(0, planInsertAt).join("")}${buildPlanStep(provisionalNumber, title)}${lines.slice(planInsertAt).join("")}`;
  const updatedLines = splitLinesKeepEnds(updated);
  const [recordSectionAfterPlan, recordBlocksAfterPlan] = extractItemBlocks(updatedLines, "执行记录");
  if (recordBlocksAfterPlan.length > 0) {
    [recordInsertAt] = insertionIndex(recordBlocksAfterPlan, targetAfter);
  } else {
    recordInsertAt = firstItemInsertIndex(updatedLines, recordSectionAfterPlan);
  }
  updated = `${updatedLines.slice(0, recordInsertAt).join("")}${buildRecordStep(provisionalNumber, title)}${updatedLines.slice(recordInsertAt).join("")}`;
  return updated;
}

export async function handleAddStep(args) {
  const filePath = path.resolve(args.path);
  try {
    const title = cleanTitle(args.title);
    const rewritten = addStep(await fs.readFile(filePath, "utf8"), title, args.after);
    await fs.writeFile(filePath, rewritten, "utf8");
    const { normalized } = await normalizeFile(filePath);
    const errors = filterIncrementalDraftErrors(await collectErrors(normalized));
    if (errors.length > 0) {
      printFail(filePath, errors, false);
      return 1;
    }
    console.log(`[runbook-add-step] inserted ${title} into ${filePath}`);
    return 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
}
