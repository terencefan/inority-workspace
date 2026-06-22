import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadJson, loadText, applyReplacements, ASSETS_DIR, ERROR_CODE_CATALOG, SCRIPTS_DIR } from "./helpers.mjs";
import { collectErrors, errorMessage, loadErrorCatalog, main } from "../scripts/commands/validate.mjs";

const REFERENCE_SPEC = path.join(ASSETS_DIR, "reference-spec.md");
const REFERENCE_LLM_SPEC = path.join(ASSETS_DIR, "reference-llm-spec.md");
const REFERENCE_DIRECTORY_OVERVIEW = path.join(ASSETS_DIR, "directory-overview", "README.md");

test("reference spec passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_SPEC), { pathValue: REFERENCE_SPEC }), []);
});

test("reference llm spec passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_LLM_SPEC), { pathValue: REFERENCE_LLM_SPEC }), []);
});


test("reference directory overview readme passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_DIRECTORY_OVERVIEW), { pathValue: REFERENCE_DIRECTORY_OVERVIEW }), []);
});

test("llm spec requires explicit system and user prompt sections", () => {
  const mutated = loadText(REFERENCE_LLM_SPEC)
    .replace(`### system prompt

给出目标状态下的 system prompt 原文示例；默认用 fenced code block 内嵌完整原文，不要只写摘要。

`, "")
    .replace(`### user prompt

给出目标状态下的 user payload 示例；展示 JSON 时默认给关键字段加行内注释，说明字段来源、用途和 authority evidence 边界。

`, "");
  const codes = new Set(collectErrors(mutated, { pathValue: REFERENCE_LLM_SPEC }).map((item) => item.code));
  assert.ok(codes.has("E006"));
});

test("error code catalog covers runtime codes", () => {
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "commands", "validate.mjs")).match(/"(E\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  runtimeCodes.add("E000");
  const catalog = loadErrorCatalog();
  const errorCatalogText = loadText(ERROR_CODE_CATALOG);
  assert.ok(errorCatalogText.startsWith("E000:"));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(errorMessage("E001"), "首行必须是 spec 标题");
});

test("asset cases emit expected error codes", () => {
  const templateText = loadText(REFERENCE_SPEC);
  const cases = loadJson(path.join(ASSETS_DIR, "validate_cases.json"));
  for (const fixture of cases) {
    const mutated = applyReplacements(templateText, fixture.replacements);
    const codes = new Set(collectErrors(mutated, { pathValue: REFERENCE_SPEC }).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

test("core stdin-json payload contains expected codes", () => {
  const fixture = loadJson(path.join(ASSETS_DIR, "validate_cases.json")).find((item) => item.name === "missing-overview-dot");
  const mutated = applyReplacements(loadText(REFERENCE_SPEC), fixture.replacements);
  let output = "";
  const status = main(["--stdin-json"], {
    stdin: JSON.stringify({ text: mutated, path: REFERENCE_SPEC }),
    stdout: { write(chunk) { output += chunk; } },
    stderr: { write() {} },
  });
  assert.equal(status, 0);
  const payload = JSON.parse(output);
  const codes = new Set(payload.errors.map((item) => item.code));
  assert.ok(codes.has("E022"));
});

test("cli path mode validates a local file path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_SPEC], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /spec ok:/);
  assert.equal(stderr, "");
});
