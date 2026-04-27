import path from "node:path";
import { promises as fs } from "node:fs";
import { splitLinesKeepEnds } from "./shared.mjs";
import { NUMBERED_H3_RE, extractH3Blocks, extractH4Blocks, normalizeRunbookNumbering, parseSections, sectionSlice } from "./normalize.mjs";
import { collectErrors, printFail } from "./validate.mjs";

function extractItemBlocks(lines, sectionName, { includeAnchor }) {
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
    let startIdx = blockStart;
    if (includeAnchor) {
      let probe = headingIdx - 1;
      while (probe > section[0] && !lines[probe].trim()) {
        probe -= 1;
      }
      if (probe > section[0] && lines[probe].trim().startsWith("<a id=")) {
        startIdx = probe;
      }
    }
    const h4Blocks = extractH4Blocks(lines, blockStart + 1, blockEnd);
    const contentEnd = h4Blocks.length > 0 ? h4Blocks[h4Blocks.length - 1][3] : blockEnd;
    blocks.push({ number: Number(match[1]), label: match[2], startIdx, contentEnd });
  }
  return blocks;
}

function removeBlockFromSection(lines, sectionName, item, { includeAnchor }) {
  const blocks = extractItemBlocks(lines, sectionName, { includeAnchor });
  const target = blocks.find((block) => block.number === item);
  if (!target) {
    throw new Error(`\`## ${sectionName}\` does not contain item ${item}`);
  }
  return [...lines.slice(0, target.startIdx), ...lines.slice(target.contentEnd)];
}

export function removeStep(text, item) {
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  let updated = removeBlockFromSection(lines, "执行计划", item, { includeAnchor: true });
  updated = removeBlockFromSection(updated, "执行记录", item, { includeAnchor: false });
  return updated.join("");
}

export async function handleRemoveStep(args) {
  const filePath = path.resolve(args.path);
  try {
    const rewritten = removeStep(await fs.readFile(filePath, "utf8"), args.item);
    const normalized = normalizeRunbookNumbering(rewritten);
    const errors = await collectErrors(normalized);
    if (errors.length > 0) {
      printFail(filePath, errors, false);
      return 1;
    }
    await fs.writeFile(filePath, normalized, "utf8");
    console.log(`[runbook-remove-step] removed item ${args.item} from ${filePath}`);
    return 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
}
