import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { SKELETON_TEMPLATE } from "../scripts/commands/init.mjs";
import { runSlidesctl } from "./helpers.mjs";

test("slidesctl init creates template file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "slides-init-"));
  try {
    const slidesPath = path.join(dir, "authority.md");
    const result = await runSlidesctl(["init", slidesPath]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(slidesPath, "utf8"), SKELETON_TEMPLATE);
    assert.match(result.stdout, /\[slides-init] created/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("slidesctl init supports title substitution and force overwrite", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "slides-init-"));
  try {
    const slidesPath = path.join(dir, "authority.md");
    let result = await runSlidesctl(["init", slidesPath, "--title", "Canary Slides Plan"]);
    assert.equal(result.status, 0);
    assert.ok(readFileSync(slidesPath, "utf8").startsWith("# Canary Slides Plan\n"));

    writeFileSync(slidesPath, "existing\n", "utf8");
    result = await runSlidesctl(["init", slidesPath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /target file already exists/);

    result = await runSlidesctl(["init", slidesPath, "--title", "Fresh Slides Plan", "--force"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\[slides-init] overwrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
