import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../scripts/commands/index.mjs";

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.dirname(TESTS_DIR);
export const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");
export const RUNCTL = path.join(SCRIPTS_DIR, "runctl.mjs");
export const ASSETS_DIR = path.join(TESTS_DIR, "assets");
export const REFERENCE_TEMPLATE = path.join(SKILL_DIR, "references", "authority-runbook-template.md");
export const PLANNING_MODE_OPERATION_REFERENCE = path.join(SKILL_DIR, "references", "planning-mode-operation.md");
export const ERROR_CODE_CATALOG = path.join(SKILL_DIR, "references", "validator-error-codes.yaml");
let runQueue = Promise.resolve();

export function loadText(targetPath) {
  return readFileSync(targetPath, "utf8");
}

export function loadJson(targetPath) {
  return JSON.parse(loadText(targetPath));
}

export function applyReplacements(text, replacements) {
  let updated = text;
  for (const replacement of replacements) {
    assert.ok(updated.includes(replacement.old), `fixture replacement target not found: ${replacement.old}`);
    updated = updated.replace(replacement.old, replacement.new);
  }
  return updated;
}

export async function runRunctl(args) {
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
      const status = await main(args, { prog: "runctl" });
      return { status, stdout, stderr };
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
    }
  });
  runQueue = task.catch(() => {});
  return task;
}
