import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../scripts/commands/index.mjs";

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.dirname(TESTS_DIR);
export const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");
export const SLIDES_TEMPLATE = path.join(SKILL_DIR, "references", "slides-template.md");
export const ERROR_CODE_CATALOG = path.join(SKILL_DIR, "references", "validator-error-codes.yaml");
let runQueue = Promise.resolve();

export function loadText(targetPath) {
  return readFileSync(targetPath, "utf8");
}

export async function runSlidesctl(args) {
  const task = runQueue.then(async () => {
    let stdout = "";
    let stderr = "";
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk, encoding, callback) => {
      stdout += typeof chunk === "string" ? chunk : chunk.toString(encoding ?? "utf8");
      if (typeof encoding === "function") {
        encoding();
      }
      if (typeof callback === "function") {
        callback();
      }
      return true;
    });
    process.stderr.write = ((chunk, encoding, callback) => {
      stderr += typeof chunk === "string" ? chunk : chunk.toString(encoding ?? "utf8");
      if (typeof encoding === "function") {
        encoding();
      }
      if (typeof callback === "function") {
        callback();
      }
      return true;
    });
    try {
      const status = await main(args, { prog: "slidesctl" });
      return { status, stdout, stderr };
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
    }
  });
  runQueue = task.catch(() => {});
  return task;
}
