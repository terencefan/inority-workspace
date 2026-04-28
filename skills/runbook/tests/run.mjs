import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import {
  applyReplacements,
  ASSETS_DIR,
  ERROR_CODE_CATALOG,
  REFERENCE_TEMPLATE,
  PLANNING_MODE_OPERATION_REFERENCE,
  SCRIPTS_DIR,
  loadJson,
  loadText,
  runRunctl,
} from "./helpers.mjs";
import { SKELETON_TEMPLATE } from "../scripts/commands/init.mjs";
import { normalizeRunbookNumbering } from "../scripts/commands/normalize.mjs";
import { collectErrors, errorMessage, filterIncrementalDraftErrors, loadErrorCatalog } from "../scripts/commands/validate.mjs";
import { collectPlanningModeErrors } from "../scripts/commands/validate_planning_mode.mjs";
import { shiftRunbookItems } from "../scripts/commands/shift_items.mjs";
import { signStep } from "../scripts/commands/sign_step.mjs";

const templateText = loadText(REFERENCE_TEMPLATE);
const validateCases = loadJson(path.join(ASSETS_DIR, "validate_cases.json"));
const planningModeValidateCases = loadJson(path.join(ASSETS_DIR, "planning_mode_validate_cases.json"));
const normalizeCases = loadJson(path.join(ASSETS_DIR, "normalize_cases.json"));
const shiftCase = loadJson(path.join(ASSETS_DIR, "shift_cases.json")).start_2_shift_2;
const signCase = loadJson(path.join(ASSETS_DIR, "sign_cases.json")).execution_ready;
const planningModeOperationText = loadText(PLANNING_MODE_OPERATION_REFERENCE);

async function withTempDir(prefix, fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error);
    process.exitCode = 1;
  }
}

function signedSource() {
  return applyReplacements(templateText, signCase.replacements);
}

function expectedShiftedText() {
  return applyReplacements(templateText, shiftCase.replacements);
}

await runCase("init creates template file", async () => {
  await withTempDir("runbook-init-", async (dir) => {
    const runbookPath = path.join(dir, "authority.md");
    const result = await runRunctl(["init", runbookPath]);
    assert.equal(result.status, 0);
    const created = readFileSync(runbookPath, "utf8");
    assert.notEqual(created, templateText);
    assert.equal(created, SKELETON_TEMPLATE);
    assert.match(result.stdout, /\[runbook-init] created/);
  });
});

await runCase("init supports title and force overwrite", async () => {
  await withTempDir("runbook-init-", async (dir) => {
    const runbookPath = path.join(dir, "authority.md");
    let result = await runRunctl(["init", runbookPath, "--title", "Canary Bootstrap"]);
    assert.equal(result.status, 0);
    assert.ok(readFileSync(runbookPath, "utf8").startsWith("# Canary Bootstrap\n"));
    writeFileSync(runbookPath, "existing\n", "utf8");
    result = await runRunctl(["init", runbookPath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /target file already exists/);
    result = await runRunctl(["init", runbookPath, "--title", "Fresh Runbook", "--force"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\[runbook-init] overwrote/);
  });
});

await runCase("validate reference template and error catalog", async () => {
  assert.deepEqual(await collectErrors(templateText), []);
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "commands", "validate.mjs")).match(/"(E\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  for (const code of loadText(path.join(SCRIPTS_DIR, "commands", "validate_planning_mode.mjs")).match(/"(E\d{3})"/g) ?? []) {
    runtimeCodes.add(code.slice(1, -1));
  }
  runtimeCodes.add("E000");
  const catalog = await loadErrorCatalog();
  assert.ok(loadText(ERROR_CODE_CATALOG).startsWith("E000:"));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(await errorMessage("E001"), "首行必须是 runbook 标题");
});

await runCase("validate planning mode reference and fixtures", async () => {
  assert.deepEqual(await collectPlanningModeErrors(planningModeOperationText, "operation"), []);
  for (const fixture of planningModeValidateCases) {
    const mutated = applyReplacements(planningModeOperationText, fixture.mutations);
    const codes = new Set((await collectPlanningModeErrors(mutated, fixture.mode)).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

await runCase("normalize and validate fixtures", async () => {
  for (const [caseName, fixture] of Object.entries(normalizeCases)) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    assert.equal(normalizeRunbookNumbering(mutated), templateText, caseName);
    assert.deepEqual(await collectErrors(mutated), [], caseName);
  }
  for (const fixture of validateCases) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    const codes = new Set((await collectErrors(mutated)).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

await runCase("validate cli json payloads", async () => {
  const fixture = validateCases.find((item) => item.name === "inline-question-options");
  await withTempDir("runbook-validate-", async (dir) => {
    const runbookPath = path.join(dir, "invalid-runbook.md");
    writeFileSync(runbookPath, applyReplacements(templateText, fixture.replacements), "utf8");
    let result = await runRunctl(["validate", runbookPath, "--json"]);
    assert.equal(result.status, 1);
    let payload = JSON.parse(result.stdout);
    assert.equal(payload.status, "fail");
    assert.equal(payload.path, path.resolve(runbookPath));
    const codes = new Set(payload.errors.map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected));
    }

    const datedDir = path.join(dir, "2026-04-23");
    mkdirSync(datedDir);
    const datedPath = path.join(datedDir, "2026-04-23-canary-bootstrap.md");
    writeFileSync(datedPath, templateText, "utf8");
    result = await runRunctl(["validate", datedPath, "--json"]);
    payload = JSON.parse(result.stdout);
    assert.ok(payload.errors.some((item) => item.code === "E106"));
  });
});

await runCase("validate cli help and pass output", async () => {
  let result = await runRunctl(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /runbook-ctl unified CLI/);
  result = await runRunctl(["validate", REFERENCE_TEMPLATE]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[runbook-validator] PASS/);
  result = await runRunctl(["validate-planning-mode", PLANNING_MODE_OPERATION_REFERENCE, "--mode", "operation"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[planning-mode-validator] PASS/);
});

await runCase("normalize and validate commands rewrite files", async () => {
  for (const [caseName, fixture] of Object.entries(normalizeCases)) {
    await withTempDir("runbook-normalize-", async (dir) => {
      const runbookPath = path.join(dir, `${caseName}-runbook.md`);
      writeFileSync(runbookPath, applyReplacements(templateText, fixture.replacements), "utf8");
      let result = await runRunctl(["normalize", runbookPath]);
      assert.equal(result.status, 0);
      assert.equal(readFileSync(runbookPath, "utf8"), templateText);
      result = await runRunctl(["validate", runbookPath]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /\[runbook-validator] PASS/);
    });
  }
});

await runCase("add-step and add-qa workflows", async () => {
  await withTempDir("runbook-add-", async (dir) => {
    const runbookPath = path.join(dir, "authority-runbook.md");
    writeFileSync(runbookPath, templateText, "utf8");
    let result = await runRunctl(["add-step", runbookPath, "--title", "检查镜像缓存", "--after", "1"]);
    assert.equal(result.status, 0);
    let content = readFileSync(runbookPath, "utf8");
    assert.equal((content.match(/### 🟡 2\. 检查镜像缓存/g) ?? []).length, 2);
    result = await runRunctl(["add-qa", runbookPath, "--question", "是否要求只读侦察先行", "--answer", "需要先冻结现场再规划", "--impact", "后续 authority 保持先 freeze 再落执行路径"]);
    assert.equal(result.status, 0);
    content = readFileSync(runbookPath, "utf8");
    assert.deepEqual(await collectErrors(content), []);
  });

  await withTempDir("runbook-add-blank-", async (dir) => {
    const runbookPath = path.join(dir, "authority-runbook.md");
    let result = await runRunctl(["init", runbookPath]);
    assert.equal(result.status, 0);
    result = await runRunctl(["add-step", runbookPath, "--title", "冻结现状"]);
    assert.equal(result.status, 0);
    result = await runRunctl(["add-qa", runbookPath, "--question", "是否先冻结现场", "--answer", "是，先冻结再继续规划", "--impact", "后续执行路径先补 freeze item"]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.deepEqual(filterIncrementalDraftErrors(await collectErrors(content)), []);
  });
});

await runCase("move/remove/sync workflows", async () => {
  await withTempDir("runbook-move-", async (dir) => {
    const runbookPath = path.join(dir, "authority.md");
    writeFileSync(runbookPath, templateText, "utf8");
    let result = await runRunctl(["remove-step", runbookPath, "--item", "2"]);
    assert.equal(result.status, 0);
    writeFileSync(runbookPath, templateText, "utf8");
    result = await runRunctl(["add-step", runbookPath, "--title", "收尾检查"]);
    assert.equal(result.status, 0);
    result = await runRunctl(["move-step", runbookPath, "--item", "3", "--after", "1"]);
    assert.equal(result.status, 0);
  });

  await withTempDir("runbook-sync-", async (dir) => {
    const runbookPath = path.join(dir, "authority.md");
    let mutated = templateText.replace("### 🔴 2. <编号项标题>", "### 🔴 2. 新的执行步骤");
    mutated = mutated.replace("### 🔴 2. <编号项标题>", "### 🔴 2. 老的记录标题");
    writeFileSync(runbookPath, mutated, "utf8");
    const result = await runRunctl(["sync-records", runbookPath]);
    assert.equal(result.status, 0);
    const content = readFileSync(runbookPath, "utf8");
    assert.ok(content.includes("### 🔴 2. 新的执行步骤"));
    assert.ok(!content.includes("### 🔴 2. 老的记录标题"));
  });
});

await runCase("shift-items workflow", async () => {
  const [rewritten, mapping] = shiftRunbookItems(templateText, shiftCase.start, shiftCase.shift);
  assert.deepEqual(mapping, { 2: 4 });
  assert.equal(rewritten, expectedShiftedText());
  await withTempDir("runbook-shift-", async (dir) => {
    const runbookPath = path.join(dir, "preview.md");
    writeFileSync(runbookPath, templateText, "utf8");
    let result = await runRunctl(["shift-items", runbookPath, "--start", `${shiftCase.start}`, "--shift", `${shiftCase.shift}`]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /### 🔴 4\. <编号项标题>/);
    result = await runRunctl(["shift-items", runbookPath, "--start", `${shiftCase.start}`, "--shift", `${shiftCase.shift}`, "--in-place"]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(runbookPath, "utf8"), expectedShiftedText());
  });
});

await runCase("sign-step workflow", async () => {
  const [rewritten, signatureLabel] = signStep(signedSource(), signCase.item, signCase.phase, signCase.signer, signCase.timestamp);
  assert.equal(signatureLabel, "@codex 2026-04-23 10:30 +0800");
  assert.deepEqual(await collectErrors(rewritten), []);
  await withTempDir("runbook-sign-", async (dir) => {
    const runbookPath = path.join(dir, "sign.md");
    writeFileSync(runbookPath, signedSource(), "utf8");
    let result = await runRunctl(["sign-step", runbookPath, "--item", `${signCase.item}`, "--phase", signCase.phase, "--signer", signCase.signer, "--timestamp", signCase.timestamp, "--dry-run"]);
    assert.equal(result.status, 0);
    const failPath = path.join(dir, "fail.md");
    writeFileSync(failPath, templateText, "utf8");
    result = await runRunctl(["sign-step", failPath, "--item", "1", "--phase", "execution"]);
    assert.equal(result.status, 1);
  });
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
