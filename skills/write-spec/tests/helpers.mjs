import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.dirname(TESTS_DIR);
export const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");
export const ASSETS_DIR = path.join(TESTS_DIR, "assets");
export const ERROR_CODE_CATALOG = path.join(SKILL_DIR, "references", "validator-error-codes.yaml");

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

