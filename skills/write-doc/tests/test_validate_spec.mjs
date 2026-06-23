import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadJson, loadText, applyReplacements, ASSETS_DIR, ERROR_CODE_CATALOG, SCRIPTS_DIR } from "./helpers.mjs";
import { collectErrors, errorMessage, listErrorCatalogPaths, loadErrorCatalog, main } from "../scripts/commands/validate.mjs";

const REFERENCE_SPEC = path.join(ASSETS_DIR, "reference-spec.md");
const REFERENCE_LLM_SPEC = path.join(ASSETS_DIR, "reference-llm-spec.md");
const REFERENCE_DIRECTORY_OVERVIEW = path.join(ASSETS_DIR, "directory-overview", "README.md");
const REFERENCE_CONTRACT = path.join(ASSETS_DIR, "reference-contract.md");
const REFERENCE_CONTRACT_OVERVIEW = path.join(ASSETS_DIR, "contract-overview", "README.md");
const REFERENCE_RCA = path.join(ASSETS_DIR, "reference-rca.md");
const REFERENCE_REPORT = path.join(ASSETS_DIR, "reference-report.md");
const REFERENCE_MODULE_README = path.join(ASSETS_DIR, "folder-readme", "README.md");
const REFERENCE_PROJECT_README = path.join(ASSETS_DIR, "project-readme", "README.md");

function fixturePath(name) {
  switch (name) {
    case "spec":
      return REFERENCE_SPEC;
    case "llm":
      return REFERENCE_LLM_SPEC;
    case "directory_overview":
      return REFERENCE_DIRECTORY_OVERVIEW;
    case "contract":
      return REFERENCE_CONTRACT;
    case "contract_overview":
      return REFERENCE_CONTRACT_OVERVIEW;
    case "rca":
      return REFERENCE_RCA;
    case "research_report":
      return REFERENCE_REPORT;
    case "readme_doc":
      return REFERENCE_MODULE_README;
    case "project_readme":
      return REFERENCE_PROJECT_README;
    default:
      throw new Error(`unknown fixture: ${name}`);
  }
}

test("reference spec passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_SPEC), { pathValue: REFERENCE_SPEC }), []);
});

test("reference llm spec passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_LLM_SPEC), { pathValue: REFERENCE_LLM_SPEC }), []);
});

test("reference directory overview readme passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_DIRECTORY_OVERVIEW), { pathValue: REFERENCE_DIRECTORY_OVERVIEW }), []);
});

test("reference contract passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_CONTRACT), { pathValue: REFERENCE_CONTRACT }), []);
});

test("reference contract overview readme passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_CONTRACT_OVERVIEW), { pathValue: REFERENCE_CONTRACT_OVERVIEW }), []);
});

test("reference rca passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_RCA), { pathValue: REFERENCE_RCA }), []);
});

test("reference research report passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_REPORT), { pathValue: REFERENCE_REPORT }), []);
});

test("reference module README passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_MODULE_README), { pathValue: REFERENCE_MODULE_README }), []);
});

test("reference project README passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_PROJECT_README), { pathValue: REFERENCE_PROJECT_README }), []);
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
  assert.ok(listErrorCatalogPaths().length >= 5);
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(errorMessage("E001"), "首行必须是 spec 标题");
});

test("asset cases emit expected error codes", () => {
  const cases = loadJson(path.join(ASSETS_DIR, "validate_cases.json"));
  for (const fixture of cases) {
    const sourcePath = fixturePath(fixture.template ?? "spec");
    const pathValue = fixture.override_path ? path.join(ASSETS_DIR, fixture.override_path) : sourcePath;
    const mutated = applyReplacements(loadText(sourcePath), fixture.replacements);
    const codes = new Set(collectErrors(mutated, { pathValue }).map((item) => item.code));
    for (const expected of fixture.expected_codes) {
      assert.ok(codes.has(expected), `${fixture.name}: ${expected}`);
    }
  }
});

test("core stdin-json payload contains expected codes", () => {
  const fixture = loadJson(path.join(ASSETS_DIR, "validate_cases.json")).find((item) => item.name === "missing-overview-dot");
  const targetPath = fixturePath(fixture.template ?? "spec");
  const mutated = applyReplacements(loadText(targetPath), fixture.replacements);
  let output = "";
  const status = main(["--stdin-json"], {
    stdin: JSON.stringify({ text: mutated, path: targetPath }),
    stdout: { write(chunk) { output += chunk; } },
    stderr: { write() {} },
  });
  assert.equal(status, 0);
  const payload = JSON.parse(output);
  const codes = new Set(payload.errors.map((item) => item.code));
  assert.ok(codes.has("E022"));
});

test("cli path mode validates a local spec path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_SPEC], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});

test("cli path mode validates a local contract path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_CONTRACT], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});

test("cli path mode validates a local rca path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_RCA], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});

test("cli path mode validates a local research report path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_REPORT], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});

test("cli path mode validates a local module README path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_MODULE_README], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});

test("cli path mode validates a local project README path", () => {
  let stdout = "";
  let stderr = "";
  const status = main([REFERENCE_PROJECT_README], {
    stdin: "",
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /document ok:/);
  assert.equal(stderr, "");
});
