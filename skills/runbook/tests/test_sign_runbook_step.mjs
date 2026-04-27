import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { applyReplacements, ASSETS_DIR, REFERENCE_TEMPLATE, loadJson, loadText, runRunctl } from "./helpers.mjs";
import { signStep } from "../scripts/commands/sign_step.mjs";
import { collectErrors } from "../scripts/commands/validate.mjs";

const templateText = loadText(REFERENCE_TEMPLATE);
const fixture = loadJson(path.join(ASSETS_DIR, "sign_cases.json")).execution_ready;

function signedSource() {
  return applyReplacements(templateText, fixture.replacements);
}

test("sign step updates plan and record headings", async () => {
  const [rewritten, signatureLabel] = signStep(signedSource(), fixture.item, fixture.phase, fixture.signer, fixture.timestamp);
  assert.equal(signatureLabel, "@codex 2026-04-23 10:30 +0800");
  for (const fragment of fixture.expected_fragments) {
    assert.ok(rewritten.includes(fragment));
  }
  assert.deepEqual(await collectErrors(rewritten), []);
});

test("runctl sign-step dry run requires validator pass", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-sign-"));
  try {
    const runbookPath = path.join(dir, "sign-dry-run.md");
    writeFileSync(runbookPath, signedSource(), "utf8");
    const result = await runRunctl([
      "sign-step",
      runbookPath,
      "--item",
      `${fixture.item}`,
      "--phase",
      fixture.phase,
      "--signer",
      fixture.signer,
      "--timestamp",
      fixture.timestamp,
      "--dry-run",
    ]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(runbookPath, "utf8"), signedSource());
    assert.match(result.stdout, /#### 执行 @codex 2026-04-23 10:30 \+0800/);
    assert.match(result.stderr, /validator passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sign script rejects placeholder record blocks", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-sign-"));
  try {
    const runbookPath = path.join(dir, "sign-fail.md");
    writeFileSync(runbookPath, templateText, "utf8");
    const result = await runRunctl(["sign-step", runbookPath, "--item", "1", "--phase", "execution"]);
    assert.equal(result.status, 1);
    assert.equal(readFileSync(runbookPath, "utf8"), templateText);
    assert.match(result.stderr, /placeholder conclusions/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
