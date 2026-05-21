import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.dirname(TESTS_DIR);
export const ASSETS_DIR = path.join(TESTS_DIR, "assets");
export const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");

export function loadText(targetPath) {
  return readFileSync(targetPath, "utf8");
}
