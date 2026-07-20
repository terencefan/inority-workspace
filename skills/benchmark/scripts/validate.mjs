#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const ALLOWED_ROOT_ENTRIES = new Set(["SKILL.md", "scripts", "tests"]);
const REQUIRED_REFERENCES = [
  "../write-doc/SKILL.md",
  "../write-doc/modes/benchmark/MODE.md",
  "../write-doc/modes/benchmark/templates/benchmark-template.md",
  "../write-doc/modes/benchmark/validator/rules.json",
  "../write-doc/modes/benchmark/validator/error-codes.yaml",
];

function error(code, message) {
  return { code, message };
}

function markdownLinks(content) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    const target = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (target && !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("#")) {
      links.push(target);
    }
  }
  return links;
}

export function validateSkill(skillDir = DEFAULT_SKILL_DIR) {
  const root = path.resolve(skillDir);
  const errors = [];
  const skillFile = path.join(root, "SKILL.md");

  if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) {
    return [error("B001", "missing required file: SKILL.md")];
  }

  const validatorFile = path.join(root, "scripts", "validate.mjs");
  if (!existsSync(validatorFile) || !lstatSync(validatorFile).isFile()) {
    errors.push(error("B006", "missing required validator: scripts/validate.mjs"));
  }

  for (const entry of readdirSync(root)) {
    if (!ALLOWED_ROOT_ENTRIES.has(entry)) {
      errors.push(error("B002", `unexpected benchmark skill root entry: ${entry}`));
    }
  }

  const content = readFileSync(skillFile, "utf8");
  if (!/^---\n[\s\S]*?^name:\s*benchmark\s*$[\s\S]*?^---$/m.test(content)) {
    errors.push(error("B003", "SKILL.md frontmatter must declare name: benchmark"));
  }

  for (const target of markdownLinks(content)) {
    const resolved = path.resolve(root, target);
    if (!existsSync(resolved)) {
      errors.push(error("B004", `broken relative reference in SKILL.md: ${target}`));
    }
  }

  for (const target of REQUIRED_REFERENCES) {
    const resolved = path.resolve(root, target);
    if (!existsSync(resolved) || !lstatSync(resolved).isFile()) {
      errors.push(error("B005", `missing benchmark mode dependency: ${target}`));
    }
  }

  return errors;
}

export function main(argv = process.argv.slice(2)) {
  const skillDir = argv[0] ? path.resolve(argv[0]) : DEFAULT_SKILL_DIR;
  const errors = validateSkill(skillDir);
  if (errors.length > 0) {
    for (const item of errors) process.stderr.write(`${item.code}: ${item.message}\n`);
    return 1;
  }
  process.stdout.write(`skill structure ok: ${skillDir}\n`);
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
