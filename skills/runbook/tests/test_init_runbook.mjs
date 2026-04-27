import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { SKELETON_TEMPLATE } from "../scripts/commands/init.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

test("runctl init creates template file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.notEqual(loadText(REFERENCE_TEMPLATE), created);
    assert.equal(created, SKELETON_TEMPLATE);
    assert.match(result.stdout, /\[runbook-init] created/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init supports title substitution", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath, "--title", "Canary Bootstrap"]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.ok(created.startsWith("# Canary Bootstrap\n"));
    assert.ok(!created.includes("# <runbook 标题>"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init refuses overwrite without force", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, "existing\n", "utf8");
    const result = await runRunctl(["init", runbookPath]);
    assert.equal(result.status, 1);
    assert.equal(readFileSync(runbookPath, "utf8"), "existing\n");
    assert.match(result.stderr, /target file already exists/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init force overwrites existing file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, "existing\n", "utf8");
    const result = await runRunctl(["init", runbookPath, "--title", "Fresh Runbook", "--force"]);
    assert.equal(result.status, 0);
    assert.ok(readFileSync(runbookPath, "utf8").startsWith("# Fresh Runbook\n"));
    assert.match(result.stdout, /\[runbook-init] overwrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
