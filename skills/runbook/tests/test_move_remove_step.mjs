import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { collectErrors } from "../scripts/commands/validate.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

test("runctl remove-step removes plan and record item", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-move-remove-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl(["remove-step", runbookPath, "--item", "2"]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.match(result.stdout, /\[runbook-remove-step] removed item 2/);
    assert.ok(!content.includes("### 🔴 2. <编号项标题>"));
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl move-step reorders existing item", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-move-remove-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const addResult = await runRunctl(["add-step", runbookPath, "--title", "收尾检查"]);
    assert.equal(addResult.status, 0);
    const moveResult = await runRunctl(["move-step", runbookPath, "--item", "3", "--after", "1"]);
    assert.equal(moveResult.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.match(moveResult.stdout, /\[runbook-move-step] moved item 3 after 1/);
    assert.equal((content.match(/### 🟡 2\. 收尾检查/g) ?? []).length, 2);
    assert.equal((content.match(/### 🔴 3\. <编号项标题>/g) ?? []).length, 2);
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
