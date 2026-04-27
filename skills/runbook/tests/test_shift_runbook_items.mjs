import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { applyReplacements, ASSETS_DIR, REFERENCE_TEMPLATE, loadJson, loadText, runRunctl } from "./helpers.mjs";
import { shiftRunbookItems } from "../scripts/commands/shift_items.mjs";

const templateText = loadText(REFERENCE_TEMPLATE);
const fixture = loadJson(path.join(ASSETS_DIR, "shift_cases.json")).start_2_shift_2;

function expectedShiftedText() {
  return applyReplacements(templateText, fixture.replacements);
}

test("shift runbook items matches asset expectation", () => {
  const [rewritten, mapping] = shiftRunbookItems(templateText, fixture.start, fixture.shift);
  assert.equal(rewritten, expectedShiftedText());
  assert.deepEqual(mapping, { 2: 4 });
  for (const fragment of fixture.absent_fragments) {
    assert.ok(!rewritten.includes(fragment));
  }
});

test("preview cli emits diff without writing file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-shift-"));
  try {
    const runbookPath = path.join(dir, "preview.md");
    writeFileSync(runbookPath, templateText, "utf8");
    const result = await runRunctl(["shift-items", runbookPath, "--start", `${fixture.start}`, "--shift", `${fixture.shift}`]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(runbookPath, "utf8"), templateText);
    assert.match(result.stdout, /---/);
    assert.match(result.stdout, /\+\+\+ /);
    assert.match(result.stdout, /### 🔴 4\. <编号项标题>/);
    assert.match(result.stderr, /Preview only: would open slots 2-3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl shift items preview matches existing cli contract", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-shift-"));
  try {
    const runbookPath = path.join(dir, "preview-runctl.md");
    writeFileSync(runbookPath, templateText, "utf8");
    const result = await runRunctl(["shift-items", runbookPath, "--start", `${fixture.start}`, "--shift", `${fixture.shift}`]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(runbookPath, "utf8"), templateText);
    assert.match(result.stdout, /### 🔴 4\. <编号项标题>/);
    assert.match(result.stderr, /Preview only: would open slots 2-3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("in place cli writes shifted content", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-shift-"));
  try {
    const runbookPath = path.join(dir, "in-place.md");
    writeFileSync(runbookPath, templateText, "utf8");
    const result = await runRunctl(["shift-items", runbookPath, "--start", `${fixture.start}`, "--shift", `${fixture.shift}`, "--in-place"]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(runbookPath, "utf8"), expectedShiftedText());
    assert.match(result.stdout, /opened slots 2-3/);
    assert.match(result.stdout, /moved 2-2 -> 4-4/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shift rejects misaligned plan and records", () => {
  const misaligned = templateText
    .replace("### 🔴 2. <编号项标题>\n\n<a id=\"item-2-execution-record\"></a>", "### 🔴 2. 不对齐标题\n\n<a id=\"item-2-execution-record\"></a>");
  assert.throws(() => shiftRunbookItems(misaligned, 2, 2), /not aligned/);
});
