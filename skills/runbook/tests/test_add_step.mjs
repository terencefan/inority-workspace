import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { collectErrors, filterIncrementalDraftErrors } from "../scripts/commands/validate.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

test("runctl add-step inserts plan and record blocks", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-step-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl(["add-step", runbookPath, "--title", "检查镜像缓存", "--after", "1"]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.match(result.stdout, /\[runbook-add-step] inserted 检查镜像缓存/);
    assert.equal((content.match(/### 🟡 2\. 检查镜像缓存/g) ?? []).length, 2);
    assert.equal((content.match(/### 🔴 3\. <编号项标题>/g) ?? []).length, 2);
    assert.ok(content.includes("[跳转到执行记录](#item-2-execution-record)"));
    assert.ok(content.includes('<a id="item-2-execution-record"></a>'));
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl add-step appends by default", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-step-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl(["add-step", runbookPath, "--title", "收尾检查"]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.equal((content.match(/### 🟡 3\. 收尾检查/g) ?? []).length, 2);
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl add-step supports blank init output", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-step-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const initResult = await runRunctl(["init", runbookPath]);
    assert.equal(initResult.status, 0);
    const result = await runRunctl(["add-step", runbookPath, "--title", "冻结现状"]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.equal((content.match(/### 🟡 1\. 冻结现状/g) ?? []).length, 2);
    assert.ok(content.includes('<a id="item-1-execution-record"></a>'));
    assert.deepEqual(filterIncrementalDraftErrors(await collectErrors(content)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
