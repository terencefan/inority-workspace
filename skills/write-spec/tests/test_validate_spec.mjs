import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { applyReplacements, ASSETS_DIR, ERROR_CODE_CATALOG, loadJson, loadText, SCRIPTS_DIR } from "./helpers.mjs";
import { collectErrors, errorMessage, loadErrorCatalog, main } from "../scripts/validate.mjs";

const REFERENCE_SPEC = path.join(ASSETS_DIR, "reference-technical-spec.md");
const SPECCTL = path.join(SCRIPTS_DIR, "specctl");

test("reference spec passes validation", async () => {
  assert.deepEqual(await collectErrors(loadText(REFERENCE_SPEC), { filePath: REFERENCE_SPEC }), []);
});

test("error code catalog covers runtime codes", async () => {
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "validate.mjs")).match(/"(E\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  runtimeCodes.add("E000");
  const catalog = await loadErrorCatalog();
  const errorCatalogText = loadText(ERROR_CODE_CATALOG);
  assert.ok(errorCatalogText.startsWith("E000:"));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(await errorMessage("E001"), "首行必须是 spec 标题");
});

test("asset cases emit expected error codes", async () => {
  const templateText = loadText(REFERENCE_SPEC);
  const cases = loadJson(path.join(ASSETS_DIR, "validate_cases.json"));
  for (const fixture of cases) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    const codes = new Set((await collectErrors(mutated, { filePath: REFERENCE_SPEC })).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

test("cli json failure payload contains expected codes", async () => {
  const fixture = loadJson(path.join(ASSETS_DIR, "validate_cases.json")).find((item) => item.name === "missing-filled-node-style");
  const dir = mkdtempSync(path.join(os.tmpdir(), "write-spec-validate-"));
  try {
    const specPath = path.join(dir, "invalid-spec.md");
    writeFileSync(specPath, applyReplacements(loadText(REFERENCE_SPEC), fixture.replacements), "utf8");
    const records = [];
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      records.push(args.join(" "));
    };
    let status = 0;
    try {
      status = await main([specPath, "--json"]);
    } finally {
      console.log = originalConsoleLog;
    }
    assert.equal(status, 1);
    const payload = JSON.parse(records.join("\n"));
    assert.equal(payload.status, "fail");
    assert.equal(payload.path, path.resolve(specPath));
    const codes = new Set(payload.errors.map((item) => item.code));
    assert.ok(codes.has("E022"));
    assert.ok(codes.has("E023"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("specctl wrapper preserves validate subcommand", async () => {
  const wrapper = loadText(SPECCTL);
  assert.match(wrapper, /^#!\/usr\/bin\/env bash/m);
  assert.match(wrapper, /if \[\[ "\$\{1-\}" == "validate" \]\]; then/);
  assert.match(wrapper, /exec node "\$SCRIPT_DIR\/validate\.mjs" "\$@"/);
});

test("external http links must be reachable", async () => {
  const base = "https://spec-validator.test";
  const validText = loadText(REFERENCE_SPEC).replace(
    "- [模板索引](../../references/template.md)\n- [访谈记录模板](../../references/interview-record-template.md)\n",
    `- [可达链接](${base}/ok)\n`,
  );
  const invalidText = loadText(REFERENCE_SPEC).replace(
    "- [模板索引](../../references/template.md)\n- [访谈记录模板](../../references/interview-record-template.md)\n",
    `- [失效链接](${base}/missing)\n`,
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const href = String(input);
    const ok = href === `${base}/ok`;
    return {
      ok,
      status: ok ? 200 : 404,
    };
  };
  try {
    assert.deepEqual(await collectErrors(validText, { filePath: REFERENCE_SPEC }), []);
    const codes = new Set((await collectErrors(invalidText, { filePath: REFERENCE_SPEC })).map((item) => item.code));
    assert.ok(codes.has("E043"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
