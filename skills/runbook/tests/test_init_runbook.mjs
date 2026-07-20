import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { SKELETON_TEMPLATE, renderTemplate } from "../scripts/commands/init.mjs";
import { collectErrors } from "../scripts/commands/validate.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

const SERIAL = { concurrency: false };

test("runctl init creates template file", SERIAL, async () => {
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

test("runctl init supports title substitution", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath, "--title", "Canary Bootstrap"]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.ok(created.startsWith("# Canary Bootstrap执行手册\n"));
    assert.ok(!created.includes("# <runbook 标题>"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init supports operation authority template", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath, "--title", "Canary Operation", "--mode", "operation"]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.ok(created.startsWith("# Canary Operation执行手册\n"));
    assert.ok(created.includes("> 当前模式：`operation`"));
    assert.ok(created.includes("### 🟢 1. 冻结现状"));
    assert.ok(created.includes("## 最终验收"));
    assert.ok(created.includes("| name | type | link | desc |"));
    const draftCodes = new Set((await collectErrors(created)).map((error) => error.code));
    assert.ok(draftCodes.has("E114"));
    assert.ok(!draftCodes.has("E101"));
    assert.ok(!draftCodes.has("E107"));
    assert.ok(!draftCodes.has("E113"));
    assert.notEqual(created, SKELETON_TEMPLATE);
    assert.equal(created, await renderTemplate({ title: "Canary Operation", mode: "operation", targetPath: runbookPath }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init injects authority source", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const sourcePath = path.join(dir, "upstream-spec.md");
    writeFileSync(sourcePath, "# upstream\n", "utf8");
    const result = await runRunctl([
      "init",
      runbookPath,
      "--title",
      "Operation Authority",
      "--mode",
      "operation",
      "--source",
      sourcePath,
    ]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.ok(created.includes("> 当前模式：`operation`"));
    assert.ok(created.includes("### 🟢 1. 冻结现状"));
    assert.ok(created.includes("[upstream-spec.md](./upstream-spec.md)"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init validates mode-related arguments", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    let result = await runRunctl(["init", runbookPath, "--mode", "operation"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--mode` requires `--title`/);

    result = await runRunctl(["init", runbookPath, "--title", "Bad Mode", "--mode", "unknown"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unsupported mode/);

    result = await runRunctl(["init", runbookPath, "--title", "Legacy Migration", "--mode", "migration"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected one of: operation/);

    result = await runRunctl(["init", runbookPath, "--title", "Bad Source", "--source", "spec.md"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--source` requires `--mode`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init preserves an existing title suffix", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath, "--title", "Canary 执行手册", "--mode", "operation"]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.ok(created.startsWith("# Canary 执行手册\n"));
    assert.ok(!created.startsWith("# Canary 执行手册执行手册\n"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl init refuses overwrite without force", SERIAL, async () => {
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

test("runctl init force overwrites existing file", SERIAL, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-init-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, "existing\n", "utf8");
    const result = await runRunctl(["init", runbookPath, "--title", "Fresh Runbook", "--force"]);
    assert.equal(result.status, 0);
    assert.ok(readFileSync(runbookPath, "utf8").startsWith("# Fresh Runbook执行手册\n"));
    assert.match(result.stdout, /\[runbook-init] overwrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
