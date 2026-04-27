import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { rmSync } from "node:fs";
import { applyReplacements, ASSETS_DIR, ERROR_CODE_CATALOG, REFERENCE_TEMPLATE, RUNCTL, SCRIPTS_DIR, loadJson, loadText, runRunctl } from "./helpers.mjs";
import { collectErrors, loadErrorCatalog, errorMessage } from "../scripts/commands/validate.mjs";
import { normalizeRunbookNumbering } from "../scripts/commands/normalize.mjs";

test("reference template passes validation", async () => {
  assert.deepEqual(await collectErrors(loadText(REFERENCE_TEMPLATE)), []);
});

test("error code catalog covers runtime codes", async () => {
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "commands", "validate.mjs")).match(/"(E\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  runtimeCodes.add("E000");
  const catalog = await loadErrorCatalog();
  const errorCatalogText = loadText(ERROR_CODE_CATALOG);
  assert.ok(errorCatalogText.startsWith("E000:"));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(await errorMessage("E001"), "首行必须是 runbook 标题");
});

test("auto normalize numbering restores template shape", async () => {
  const templateText = loadText(REFERENCE_TEMPLATE);
  const normalizeCases = loadJson(path.join(ASSETS_DIR, "normalize_cases.json"));
  for (const [caseName, fixture] of Object.entries(normalizeCases)) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    const normalized = normalizeRunbookNumbering(mutated);
    assert.equal(normalized, templateText, caseName);
    assert.deepEqual(await collectErrors(mutated), [], caseName);
  }
});

test("asset cases emit expected error codes", async () => {
  const templateText = loadText(REFERENCE_TEMPLATE);
  const cases = loadJson(path.join(ASSETS_DIR, "validate_cases.json"));
  for (const fixture of cases) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    const codes = new Set((await collectErrors(mutated)).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

test("cli json failure payload contains expected codes", async () => {
  const templateText = loadText(REFERENCE_TEMPLATE);
  const fixture = loadJson(path.join(ASSETS_DIR, "validate_cases.json")).find((item) => item.name === "inline-question-options");
  const mutated = applyReplacements(templateText, fixture.replacements);
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-validate-"));
  try {
    const runbookPath = path.join(dir, "invalid-runbook.md");
    writeFileSync(runbookPath, mutated, "utf8");
    const result = await runRunctl(["validate", runbookPath, "--json"]);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, "fail");
    assert.equal(payload.path, path.resolve(runbookPath));
    assert.ok("natural_language_summary" in payload);
    assert.ok("natural_language_items" in payload);
    const codes = new Set(payload.errors.map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("title must not include date", async () => {
  const mutated = loadText(REFERENCE_TEMPLATE).replace("# <runbook 标题>", "# 2026-04-23 Canary Bootstrap");
  const codes = new Set((await collectErrors(mutated)).map((item) => item.code));
  assert.ok(codes.has("E105"));
});

test("filename must not include date", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-validate-"));
  try {
    const datedDir = path.join(dir, "2026-04-23");
    mkdirSync(datedDir);
    const runbookPath = path.join(datedDir, "2026-04-23-canary-bootstrap.md");
    writeFileSync(runbookPath, loadText(REFERENCE_TEMPLATE), "utf8");
    const result = await runRunctl(["validate", runbookPath, "--json"]);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    const codes = new Set(payload.errors.map((item) => item.code));
    assert.ok(codes.has("E106"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runctl validate help lists subcommands", async () => {
  const result = await runRunctl(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /runbook-ctl unified CLI/);
  assert.match(result.stdout, /usage: runctl/);
  for (const command of ["init", "add-step", "add-qa", "move-step", "remove-step", "normalize", "validate", "shift-items", "sign-step", "sync-records"]) {
    assert.match(result.stdout, new RegExp(command.replace("-", "\\-")));
  }
});

test("runctl normalize writes normalized numbering back to file", async () => {
  const templateText = loadText(REFERENCE_TEMPLATE);
  const normalizeCases = loadJson(path.join(ASSETS_DIR, "normalize_cases.json"));
  for (const [caseName, fixture] of Object.entries(normalizeCases)) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-normalize-"));
    try {
      const runbookPath = path.join(dir, `${caseName}.md`);
      writeFileSync(runbookPath, applyReplacements(templateText, fixture.replacements), "utf8");
      const result = await runRunctl(["normalize", runbookPath]);
      assert.equal(result.status, 0);
      assert.equal(readFileSync(runbookPath, "utf8"), templateText);
      assert.match(result.stdout, /\[runbook-normalize] updated/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("runctl validate passes reference template", async () => {
  const result = await runRunctl(["validate", REFERENCE_TEMPLATE]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[runbook-validator] PASS/);
});

test("runctl validate writes normalized numbering back to file", async () => {
  const templateText = loadText(REFERENCE_TEMPLATE);
  const normalizeCases = loadJson(path.join(ASSETS_DIR, "normalize_cases.json"));
  for (const [caseName, fixture] of Object.entries(normalizeCases)) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "runbook-validate-"));
    try {
      const runbookPath = path.join(dir, `${caseName}.md`);
      writeFileSync(runbookPath, applyReplacements(templateText, fixture.replacements), "utf8");
      const result = await runRunctl(["validate", runbookPath]);
      assert.equal(result.status, 0);
      assert.equal(readFileSync(runbookPath, "utf8"), templateText);
      assert.match(result.stdout, /\[runbook-validator] PASS/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
