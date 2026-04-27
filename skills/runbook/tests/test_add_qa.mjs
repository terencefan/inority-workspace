import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { collectErrors, filterIncrementalDraftErrors } from "../scripts/commands/validate.mjs";
import { REFERENCE_TEMPLATE, loadText, runRunctl } from "./helpers.mjs";

test("runctl add-qa appends structured interview entry", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-qa-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl([
      "add-qa",
      runbookPath,
      "--question",
      "是否要求只读侦察先行",
      "--answer",
      "需要先冻结现场再规划",
      "--impact",
      "后续 authority 保持先 freeze 再落执行路径",
    ]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.match(result.stdout, /\[runbook-add-qa] appended QA/);
    assert.ok(content.includes("### Q：是否要求只读侦察先行"));
    assert.ok(content.includes("> A：需要先冻结现场再规划"));
    assert.match(content, /访谈时间：\d{4}-\d{2}-\d{2} \d{2}:\d{2} .+\n\n后续 authority 保持先 freeze 再落执行路径/);
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl add-qa supports explicit interview time", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-qa-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl([
      "add-qa",
      runbookPath,
      "--question",
      "是否需要记录提问时间",
      "--answer",
      "需要，方便回看规划上下文",
      "--time",
      "2026-04-23 14:30 CST",
      "--impact",
      "后续复盘可以对齐当时的现场状态",
    ]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.ok(content.includes("访谈时间：2026-04-23 14:30 CST"));
    assert.ok(content.includes("访谈时间：2026-04-23 14:30 CST\n\n后续复盘可以对齐当时的现场状态"));
    assert.deepEqual(await collectErrors(content), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl add-qa supports blank init output", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-add-qa-"));
  try {
    const runbookPath = path.join(dir, "authority.md");
    const initResult = await runRunctl(["init", runbookPath]);
    assert.equal(initResult.status, 0);
    const result = await runRunctl([
      "add-qa",
      runbookPath,
      "--question",
      "是否先冻结现场",
      "--answer",
      "是，先冻结再继续规划",
      "--impact",
      "后续执行路径先补 freeze item",
    ]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.ok(content.includes("### Q：是否先冻结现场"));
    assert.ok(content.includes("> A：是，先冻结再继续规划"));
    assert.deepEqual(filterIncrementalDraftErrors(await collectErrors(content)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
