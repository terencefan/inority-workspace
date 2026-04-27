import path from "node:path";
import { promises as fs } from "node:fs";
import { normalizeRunbookNumbering, STEP_SIGNED_ACCEPT_RE, STEP_SIGNED_EXEC_RE, extractH3Blocks, extractH4Blocks, parseSections, sectionSlice } from "./normalize.mjs";
import { renderDiff } from "./shift_items.mjs";
import { collectErrors, printFail, NUMBERED_H3_RE, RECORD_SIGNED_ACCEPT_RE, RECORD_SIGNED_EXEC_RE } from "./validate.mjs";

const SIGNATURE_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$/;
const PHASE_SPECS = {
  execution: {
    planHeading: "执行",
    planRegex: STEP_SIGNED_EXEC_RE,
    recordHeading: "执行记录",
    recordRegex: RECORD_SIGNED_EXEC_RE,
  },
  acceptance: {
    planHeading: "验收",
    planRegex: STEP_SIGNED_ACCEPT_RE,
    recordHeading: "验收记录",
    recordRegex: RECORD_SIGNED_ACCEPT_RE,
  },
};
const PHASE_ALIASES = {
  execution: "execution",
  exec: "execution",
  acceptance: "acceptance",
  accept: "acceptance",
};

export function normalizePhase(phase) {
  return PHASE_ALIASES[phase];
}

export function buildSignatureLabel(signer, timestamp = null) {
  const normalizedSigner = signer.trim().replace(/^@/, "");
  if (!normalizedSigner || /\s/.test(normalizedSigner)) {
    throw new Error("`--signer` must be a non-empty single token without spaces");
  }
  let finalTimestamp = timestamp;
  if (finalTimestamp == null) {
    const now = new Date();
    const pad = (value) => `${value}`.padStart(2, "0");
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
    const minutes = pad(Math.abs(offsetMinutes) % 60);
    finalTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} ${sign}${hours}${minutes}`;
  }
  if (!SIGNATURE_TIMESTAMP_RE.test(finalTimestamp)) {
    throw new Error("`--timestamp` must match `YYYY-MM-DD HH:MM TZ`");
  }
  return `@${normalizedSigner} ${finalTimestamp}`;
}

function findNumberedItemBlock(lines, sectionName, itemNumber) {
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, sectionName, lines.length);
  if (!section) {
    throw new Error(`missing \`## ${sectionName}\` section`);
  }
  for (const [headingIdx, title, blockStart, blockEnd] of extractH3Blocks(lines, section[0] + 1, section[1])) {
    const match = title.match(NUMBERED_H3_RE);
    if (match && Number(match[1]) === itemNumber) {
      return [headingIdx, title, blockStart, blockEnd];
    }
  }
  throw new Error(`\`## ${sectionName}\` does not contain item ${itemNumber}`);
}

function replaceH4Heading(lines, start, end, plainHeading, signedRegex, replacement) {
  for (const [headingIdx, title] of extractH4Blocks(lines, start + 1, end)) {
    const fullHeading = `#### ${title}`;
    if (title === plainHeading || signedRegex.test(fullHeading)) {
      const newline = lines[headingIdx].endsWith("\n") ? "\n" : "";
      lines[headingIdx] = `${replacement}${newline}`;
      return true;
    }
  }
  return false;
}

function ensureRecordBlockReadyForSignature(lines, start, end, recordHeading, signedRegex) {
  for (const [, title, blockStart, blockEnd] of extractH4Blocks(lines, start + 1, end)) {
    const fullHeading = `#### ${title}`;
    if (title !== recordHeading && !signedRegex.test(fullHeading)) {
      continue;
    }
    const body = lines.slice(blockStart, blockEnd).join("\n");
    if (body.includes("待执行") || body.includes("待验收")) {
      throw new Error("target record block still contains placeholder conclusions; fill evidence before signing");
    }
    return;
  }
  throw new Error(`missing \`#### ${recordHeading}\` block in execution records`);
}

export function signStep(text, item, phase, signer, timestamp = null) {
  const normalizedPhase = normalizePhase(phase);
  const phaseSpec = PHASE_SPECS[normalizedPhase];
  const signatureLabel = buildSignatureLabel(signer, timestamp);
  const lines = text.match(/[^\n]*\n|[^\n]+/g) ?? [];
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  const [planHeadingIdx, , planStart, planEnd] = findNumberedItemBlock(lines, "执行计划", item);
  const [, , recordStart, recordEnd] = findNumberedItemBlock(lines, "执行记录", item);
  ensureRecordBlockReadyForSignature(lines, recordStart, recordEnd, phaseSpec.recordHeading, phaseSpec.recordRegex);
  const planReplacement = `#### ${phaseSpec.planHeading} ${signatureLabel}`;
  const recordReplacement = `#### ${phaseSpec.recordHeading} ${signatureLabel}`;
  if (!replaceH4Heading(lines, planStart, planEnd, phaseSpec.planHeading, phaseSpec.planRegex, planReplacement)) {
    throw new Error(`\`### ${lines[planHeadingIdx].trim()}\` missing \`#### ${phaseSpec.planHeading}\` block`);
  }
  if (!replaceH4Heading(lines, recordStart, recordEnd, phaseSpec.recordHeading, phaseSpec.recordRegex, recordReplacement)) {
    throw new Error(`\`## 执行记录\` item ${item} missing \`#### ${phaseSpec.recordHeading}\` block`);
  }
  return [lines.join(""), signatureLabel];
}

export async function handleSignStep(args) {
  const filePath = path.resolve(args.runbook);
  const source = await fs.readFile(filePath, "utf8");
  let rewritten;
  let signatureLabel;
  try {
    [rewritten, signatureLabel] = signStep(source, args.item, args.phase, args.signer, args.timestamp);
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
  const normalized = normalizeRunbookNumbering(rewritten);
  const errors = await collectErrors(normalized);
  if (errors.length > 0) {
    printFail(filePath, errors, false);
    return 1;
  }
  if (args.dryRun) {
    const diff = renderDiff(filePath, source, normalized);
    if (diff) {
      process.stdout.write(diff);
    }
    console.error(`Preview only: would sign item ${args.item} ${normalizePhase(args.phase)} as ${signatureLabel}; validator passed.`);
    return 0;
  }
  await fs.writeFile(filePath, normalized, "utf8");
  console.log(`Signed item ${args.item} ${normalizePhase(args.phase)} in ${filePath} as ${signatureLabel}; validator passed.`);
  return 0;
}
