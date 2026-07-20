import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateSkill } from "../scripts/validate.mjs";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("current benchmark skill structure and references are valid", () => {
  assert.deepEqual(validateSkill(SKILL_DIR), []);
});

test("validator rejects unexpected root assets and broken references", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "benchmark-skill-"));
  mkdirSync(path.join(root, "templates"));
  writeFileSync(
    path.join(root, "SKILL.md"),
    "---\nname: benchmark\ndescription: test\n---\n\n[missing](./missing.md)\n",
  );

  const codes = new Set(validateSkill(root).map((item) => item.code));
  assert.ok(codes.has("B002"));
  assert.ok(codes.has("B004"));
  assert.ok(codes.has("B005"));
  assert.ok(codes.has("B006"));
});
