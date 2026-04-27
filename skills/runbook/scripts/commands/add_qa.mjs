import path from "node:path";
import { promises as fs } from "node:fs";
import { currentInterviewTime, cleanSingleLine, splitLinesKeepEnds } from "./shared.mjs";
import { normalizeFile, parseSections, sectionSlice } from "./normalize.mjs";
import { collectErrors, filterIncrementalDraftErrors, printFail } from "./validate.mjs";

export function addQa(text, question, answer, impact, interviewTime = null) {
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0) {
    throw new Error("runbook is empty");
  }
  const h2Sections = parseSections(lines, 2);
  const section = sectionSlice(h2Sections, "访谈记录", lines.length);
  if (!section) {
    throw new Error("missing `## 访谈记录` section");
  }
  const insertAt = section[1];
  const timeLine = `访谈时间：${interviewTime ?? currentInterviewTime()}\n\n`;
  const block = `\n### Q：${question}\n\n> A：${answer}\n\n${timeLine}${impact}\n`;
  return `${lines.slice(0, insertAt).join("")}${block}${lines.slice(insertAt).join("")}`;
}

export async function handleAddQa(args) {
  const filePath = path.resolve(args.path);
  try {
    const question = cleanSingleLine("question", args.question);
    const answer = cleanSingleLine("answer", args.answer);
    const impact = cleanSingleLine("impact", args.impact);
    const interviewTime = args.time == null ? null : cleanSingleLine("time", args.time);
    const rewritten = addQa(await fs.readFile(filePath, "utf8"), question, answer, impact, interviewTime);
    await fs.writeFile(filePath, rewritten, "utf8");
    const { normalized } = await normalizeFile(filePath);
    const errors = filterIncrementalDraftErrors(await collectErrors(normalized));
    if (errors.length > 0) {
      printFail(filePath, errors, false);
      return 1;
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
  console.log(`[runbook-add-qa] appended QA to ${filePath}`);
  return 0;
}
