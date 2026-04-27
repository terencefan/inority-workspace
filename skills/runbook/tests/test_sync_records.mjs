import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { collectErrors } from "../scripts/commands/validate.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

test("runctl sync-records rebuilds record titles from plan", async () => {
  const mutated = loadText(REFERENCE_TEMPLATE)
    .replace("### 🔴 2. <编号项标题>", "### 🔴 2. 新的执行步骤")
    .replace("### 🔴 2. <编号项标题>", "### 🔴 2. 老的记录标题");
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-sync-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, mutated, "utf8");
    const result = await runRunctl(["sync-records", runbookPath]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.match(result.stdout, /\[runbook-sync-records] synchronized records/);
    assert.equal((content.match(/### 🔴 2\. 新的执行步骤/g) ?? []).length, 2);
    assert.ok(!content.includes("### 🔴 2. 老的记录标题"));
    assert.ok(content.includes('<a id="item-2-execution-record"></a>'));
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
