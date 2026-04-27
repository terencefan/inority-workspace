import path from "node:path";
import { promises as fs } from "node:fs";
import { NUMBERED_H3_RE, extractH3Blocks, parseSections, sectionSlice } from "./normalize.mjs";

const HEADING_RE = /^(### )(?:[🟢🟡🔴]\s+)?(\d+)(\. .*)$/u;
const ITEM_TOKEN_RE = /item-(\d+)(-execution-record|-acceptance-record)?/g;
const TRAFFIC_PREFIXES = ["🟢 ", "🟡 ", "🔴 "];

function loadNumberedSteps(lines, sectionName) {
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, sectionName, lines.length);
  if (!section) {
    throw new Error(`missing \`## ${sectionName}\` section`);
  }
  const [start, end] = section;
  const steps = [];
  for (const [headingIdx, title] of extractH3Blocks(lines, start + 1, end)) {
    const match = title.match(NUMBERED_H3_RE);
    if (!match) {
      throw new Error(`\`## ${sectionName}\` contains a non-numbered step heading: ${title}`);
    }
    steps.push({ number: Number(match[1]), label: match[2], headingIdx });
  }
  if (steps.length === 0) {
    throw new Error(`\`## ${sectionName}\` does not contain any numbered items`);
  }
  return [section, steps];
}

function ensureStepAlignment(planSteps, recordSteps) {
  const planShape = planSteps.map((step) => [step.number, step.label]);
  const recordShape = recordSteps.map((step) => [step.number, step.label]);
  if (JSON.stringify(planShape) !== JSON.stringify(recordShape)) {
    throw new Error("`## 执行计划` and `## 执行记录` are not aligned; renumbering aborted");
  }
}

function buildMapping(steps, start, shift) {
  if (start < 1) {
    throw new Error("`--start` must be >= 1");
  }
  if (shift < 1) {
    throw new Error("`--shift` must be >= 1");
  }
  const existingNumbers = new Set(steps.map((step) => step.number));
  if (!existingNumbers.has(start)) {
    throw new Error(`\`--start ${start}\` does not match an existing item; available numbers: ${steps.map((step) => step.number).join(", ")}`);
  }
  const mapping = new Map();
  for (const step of steps) {
    if (step.number >= start) {
      mapping.set(step.number, step.number + shift);
    }
  }
  return mapping;
}

function replaceHeading(line, mapping) {
  const newline = line.endsWith("\n") ? "\n" : "";
  const body = newline ? line.slice(0, -1) : line;
  const match = body.match(HEADING_RE);
  if (!match) {
    return line;
  }
  const oldNumber = Number(match[2]);
  const newNumber = mapping.get(oldNumber);
  if (!newNumber) {
    return line;
  }
  let trafficLight = "";
  const titleBody = body.slice(match[1].length);
  trafficLight = TRAFFIC_PREFIXES.find((prefix) => titleBody.startsWith(prefix)) ?? "";
  return `${match[1]}${trafficLight}${newNumber}${match[3]}${newline}`;
}

function replaceItemTokens(line, mapping) {
  return line.replace(ITEM_TOKEN_RE, (full, number, suffix = "") => {
    const newNumber = mapping.get(Number(number));
    return newNumber ? `item-${newNumber}${suffix}` : full;
  });
}

function rewriteSection(lines, section, mapping, { rewriteHeadings }) {
  const [start, end] = section;
  for (let idx = start + 1; idx < end; idx += 1) {
    let line = rewriteHeadings ? replaceHeading(lines[idx], mapping) : lines[idx];
    line = replaceItemTokens(line, mapping);
    lines[idx] = line;
  }
}

export function shiftRunbookItems(text, start, shift) {
  const lines = text.match(/[^\n]*\n|[^\n]+/g) ?? [];
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  const plainLines = lines.map((line) => line.replace(/\n$/, ""));
  const [planSection, planSteps] = loadNumberedSteps(plainLines, "执行计划");
  const [recordSection, recordSteps] = loadNumberedSteps(plainLines, "执行记录");
  ensureStepAlignment(planSteps, recordSteps);
  const mapping = buildMapping(planSteps, start, shift);
  const updatedLines = [...lines];
  rewriteSection(updatedLines, planSection, mapping, { rewriteHeadings: true });
  rewriteSection(updatedLines, recordSection, mapping, { rewriteHeadings: false });
  return [updatedLines.join(""), Object.fromEntries(mapping)];
}

export function renderDiff(filePath, before, after) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  let output = `--- ${filePath}\n+++ ${filePath}\n`;
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i += 1) {
    if (beforeLines[i] === afterLines[i]) {
      continue;
    }
    if (beforeLines[i] != null) {
      output += `-${beforeLines[i]}\n`;
    }
    if (afterLines[i] != null) {
      output += `+${afterLines[i]}\n`;
    }
  }
  return output;
}

export async function handleShiftItems(args) {
  const filePath = path.resolve(args.runbook);
  const source = await fs.readFile(filePath, "utf8");
  let rewritten;
  let mapping;
  try {
    [rewritten, mapping] = shiftRunbookItems(source, args.start, args.shift);
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
  if (rewritten === source) {
    console.error("No numbering changes were required.");
    return 0;
  }
  const openedEnd = args.start + args.shift - 1;
  const movedKeys = Object.keys(mapping).map(Number);
  const movedSummary = `${Math.min(...movedKeys)}-${Math.max(...movedKeys)} -> ${Math.min(...Object.values(mapping))}-${Math.max(...Object.values(mapping))}`;
  if (args.inPlace) {
    await fs.writeFile(filePath, rewritten, "utf8");
    console.log(`Shifted ${movedKeys.length} item(s) in ${filePath}; opened slots ${args.start}-${openedEnd}; moved ${movedSummary}.`);
    return 0;
  }
  const diff = renderDiff(filePath, source, rewritten);
  if (diff) {
    process.stdout.write(diff);
  } else {
    console.error("No numbering changes were required.");
  }
  console.error(`Preview only: would open slots ${args.start}-${openedEnd} by shifting ${movedKeys.length} item(s).`);
  return 0;
}
