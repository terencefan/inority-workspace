import path from "node:path";
import { promises as fs } from "node:fs";
import { splitLinesKeepEnds } from "./shared.mjs";
import { NUMBERED_H3_RE, extractH3Blocks, normalizeFile, parseSections, sectionSlice } from "./normalize.mjs";
import { collectErrors, printFail } from "./validate.mjs";

const TRAFFIC_PREFIXES = ["🟢 ", "🟡 ", "🔴 "];

function buildRecordBlock(number, title, trafficLight = "") {
  return `### ${trafficLight}${number}. ${title}\n\n<a id="item-${number}-execution-record"></a>\n\n#### 执行记录\n\n执行命令：\n\n\`\`\`bash\n...\n\`\`\`\n\n执行结果：\n\n\`\`\`text\n...\n\`\`\`\n\n执行结论：\n\n- 待执行\n\n<a id="item-${number}-acceptance-record"></a>\n\n#### 验收记录\n\n验收命令：\n\n\`\`\`bash\n...\n\`\`\`\n\n验收结果：\n\n\`\`\`text\n...\n\`\`\`\n\n验收结论：\n\n- 待执行\n`;
}

export function syncRecords(text) {
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  const h2Sections = parseSections(lines, 2);
  const planSection = sectionSlice(h2Sections, "执行计划", lines.length);
  const recordSection = sectionSlice(h2Sections, "执行记录", lines.length);
  if (!planSection || !recordSection) {
    throw new Error("missing `## 执行计划` or `## 执行记录` section");
  }
  const planBlocks = extractH3Blocks(lines, planSection[0] + 1, planSection[1]);
  if (planBlocks.length === 0) {
    throw new Error("`## 执行计划` does not contain any numbered items");
  }
  const recordBody = planBlocks
    .map(([, title]) => {
      const match = title.match(NUMBERED_H3_RE);
      if (!match) {
        return "";
      }
      const trafficLight = TRAFFIC_PREFIXES.find((prefix) => title.startsWith(prefix)) ?? "";
      return buildRecordBlock(Number(match[1]), match[2], trafficLight);
    })
    .join("");
  const replacement = `## 执行记录\n\n${recordBody}`;
  return `${lines.slice(0, recordSection[0]).join("")}${replacement}${lines.slice(recordSection[1]).join("")}`;
}

export async function handleSyncRecords(args) {
  const filePath = path.resolve(args.path);
  try {
    const rewritten = syncRecords(await fs.readFile(filePath, "utf8"));
    await fs.writeFile(filePath, rewritten, "utf8");
    const { normalized } = await normalizeFile(filePath);
    const errors = await collectErrors(normalized);
    if (errors.length > 0) {
      printFail(filePath, errors, false);
      return 1;
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
  console.log(`[runbook-sync-records] synchronized records in ${filePath}`);
  return 0;
}
