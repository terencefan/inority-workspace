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
const REFERENCE_BENCHMARK = path.join(ASSETS_DIR, "reference-benchmark.md");
const REFERENCE_MODULE_README = path.join(ASSETS_DIR, "folder-readme", "README.md");
const REFERENCE_PROJECT_README = path.join(ASSETS_DIR, "project-readme", "README.md");

const TEMPLATE_CASES = [
  ["modes/spec/templates/product-spec-template.md", "/tmp/product-spec.md"],
  ["modes/spec/templates/technical-spec-template.md", "/tmp/technical-spec.md"],
  ["modes/spec/templates/llm-node-spec-template.md", "/tmp/llm-node-spec.md"],
  ["modes/spec/templates/spec-overview-readme-template.md", "/tmp/spec/README.md"],
  ["modes/contract/templates/contract-template.md", "/tmp/example-contract.md"],
  ["modes/contract/templates/contract-overview-readme-template.md", "/tmp/contract/README.md"],
  ["modes/readme/templates/project-readme-template.md", "/tmp/project/README.md"],
  ["modes/readme/templates/module-readme-template.md", "/tmp/module/README.md"],
  ["modes/benchmark/templates/benchmark-template.md", "/tmp/example-benchmark.md"],
  ["modes/report/templates/report-template.md", "/tmp/example-report.md"],
  ["modes/rca/templates/rca-template.md", "/tmp/example-rca.md"],
];

test("full document templates conform to their mode validators", () => {
  for (const [relativePath, targetPath] of TEMPLATE_CASES) {
    const templatePath = path.join(path.dirname(ASSETS_DIR), "..", relativePath);
    assert.deepEqual(
      collectErrors(loadText(templatePath), { pathValue: targetPath }),
      [],
      `invalid template: ${relativePath}`,
    );
  }
});

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
    case "benchmark_report":
      return REFERENCE_BENCHMARK;
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

test("spec architecture and module sections enforce three-level depth and control/data callouts", () => {
  const reference = loadText(REFERENCE_SPEC);
  const tooDeep = reference.replace(
    "### 外部入口层\n\n说明这一层负责什么，与上下游如何连接。",
    "### 外部入口层\n\n#### 入口模块\n\n##### 过深实现\n\n说明。",
  );
  assert.ok(new Set(collectErrors(tooDeep, { pathValue: REFERENCE_SPEC }).map((item) => item.code)).has("E015"));

  const missingMappingCallout = reference.replace(
    "### 外部入口层\n\n说明这一层负责什么，与上下游如何连接。",
    "### 控制面\n\n#### 网关控制层\n\n说明这一层负责什么。",
  );
  assert.ok(new Set(collectErrors(missingMappingCallout, { pathValue: REFERENCE_SPEC }).map((item) => item.code)).has("E016"));
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

test("reference benchmark passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_BENCHMARK), { pathValue: REFERENCE_BENCHMARK }), []);
});

test("benchmark requires one callout and KaTeX formula per statistical metric", () => {
  const reference = loadText(REFERENCE_BENCHMARK);
  const withoutMetricHeading = reference.replace("#### 吞吐量", "吞吐量");
  assert.ok(new Set(collectErrors(withoutMetricHeading).map((item) => item.code)).has("E070"));

  const withoutCallout = reference.replace("> [!NOTE]\n> 回答单位墙钟时间内成功完成的请求数；越高越好，作为主判定指标。\n", "吞吐量定义如下。\n");
  assert.ok(new Set(collectErrors(withoutCallout).map((item) => item.code)).has("E071"));

  const withoutFormula = reference.replace("```katex\nR_j=\\frac{N_j}{T_j}\n```", "吞吐量等于成功数除以窗口秒数。");
  assert.ok(new Set(collectErrors(withoutFormula).map((item) => item.code)).has("E072"));
});

test("benchmark requires a classified callout for every experiment", () => {
  const mutated = loadText(REFERENCE_BENCHMARK)
    .replace("> [!TIP]\n> 结论分类：显著正向（+100.0%）。吞吐量达到目标且约束通过。\n", "吞吐量达到目标。\n");
  const codes = new Set(collectErrors(mutated, { pathValue: REFERENCE_BENCHMARK }).map((item) => item.code));
  assert.ok(codes.has("E067"));
});

test("benchmark requires a markdown result table for every experiment", () => {
  const mutated = loadText(REFERENCE_BENCHMARK)
    .replace("| 项目 | 结果 |\n| --- | --- |\n| 吞吐量 | 20 req/s |\n| 证据 | `/tmp/run.json` |", "吞吐量为 20 req/s");
  const codes = new Set(collectErrors(mutated, { pathValue: REFERENCE_BENCHMARK }).map((item) => item.code));
  assert.ok(codes.has("E068"));
});

test("benchmark accepts an unrelated experiment callout", () => {
  const mutated = loadText(REFERENCE_BENCHMARK)
    .replace("> [!TIP]\n> 结论分类：显著正向（+100.0%）。吞吐量达到目标且约束通过。", "> [!IMPORTANT]\n> 结论分类：不相关（排除）。该实验没有可比较的控制组。");
  assert.deepEqual(collectErrors(mutated, { pathValue: REFERENCE_BENCHMARK }), []);
});

test("benchmark completed callout requires a signed relative percentage", () => {
  const mutated = loadText(REFERENCE_BENCHMARK)
    .replace("显著正向（+100.0%）", "显著正向");
  const codes = new Set(collectErrors(mutated, { pathValue: REFERENCE_BENCHMARK }).map((item) => item.code));
  assert.ok(codes.has("E069"));
});

test("reference module README passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_MODULE_README), { pathValue: REFERENCE_MODULE_README }), []);
});

test("reference project README passes validation", () => {
  assert.deepEqual(collectErrors(loadText(REFERENCE_PROJECT_README), { pathValue: REFERENCE_PROJECT_README }), []);
});

test("project README accepts storage layout in its optional position", () => {
  const reference = loadText(REFERENCE_PROJECT_README);
  const withStorageLayout = reference.replace(
    "## 部署拓扑",
    "## 存储布局\n\n- `s3://example/project/`\n\n## 部署拓扑",
  );
  assert.deepEqual(collectErrors(withStorageLayout, { pathValue: REFERENCE_PROJECT_README }), []);
});

test("project README rejects misplaced or duplicate storage layout sections", () => {
  const reference = loadText(REFERENCE_PROJECT_README);
  const misplaced = reference.replace(
    "## 代码结构",
    "## 存储布局\n\n- `s3://example/project/`\n\n## 代码结构",
  );
  const duplicate = reference.replace(
    "## 部署拓扑",
    "## 存储布局\n\n- `s3://example/project/`\n\n## 存储布局\n\n- `s3://example/archive/`\n\n## 部署拓扑",
  );

  assert.ok(collectErrors(misplaced, { pathValue: REFERENCE_PROJECT_README }).some((item) => item.code === "E010"));
  assert.ok(collectErrors(duplicate, { pathValue: REFERENCE_PROJECT_README }).some((item) => item.code === "E010"));
});

function benchmarkWithExperiments(groupIds, resultIds) {
  const requiredSections = ["结论", "目标", "范围", "方法", "实验基线"];
  const lines = [
    "# Example Benchmark",
    "",
    "> [!NOTE]",
    "> 当前文档类型：benchmark",
    "",
    ...requiredSections.flatMap((title) => {
      if (title === "目标") return ["## 目标", "", "### 待提升的指标", "", "### 实验约束", ""];
      if (title === "方法") return ["## 方法", "", "### 实验设计", "", "### 统计方法", ""];
      return [`## ${title}`, ""];
    }),
    "## 实验组",
    "",
    "| 实验组 | 状态 |",
    "| --- | --- |",
    ...groupIds.map((id) => `| ${id} test | completed |`),
    "",
    "## 实验结果",
    "",
    "### 结果总表",
    "",
    ...resultIds.flatMap((id) => [`### ${id} test`, ""]),
    "## 排除项", "", "## 未确认项", "", "## 资源回收", "", "## 建议", "",
    "## 参考资料", "", "- [asset](./asset.json)", "",
  ];
  return lines.join("\n");
}

test("benchmark experiment groups and results map one-to-one in increasing order", () => {
  const errors = collectErrors(benchmarkWithExperiments(["N1", "N2", "P0", "N2b", "N3"], ["N1", "N2", "P0", "N2b", "N3"]));
  assert.equal(errors.some((item) => item.code === "E065" || item.code === "E066"), false);
});

test("benchmark rejects missing or duplicate result cards", () => {
  const codes = new Set(collectErrors(benchmarkWithExperiments(["N1", "N2"], ["N1", "N1"])).map((item) => item.code));
  assert.ok(codes.has("E065"));
});

test("benchmark rejects mismatched order and decreasing experiment IDs", () => {
  const orderCodes = new Set(collectErrors(benchmarkWithExperiments(["N1", "N2"], ["N2", "N1"])).map((item) => item.code));
  const decreasingCodes = new Set(collectErrors(benchmarkWithExperiments(["N2", "N1"], ["N2", "N1"])).map((item) => item.code));
  assert.ok(orderCodes.has("E066"));
  assert.ok(decreasingCodes.has("E066"));
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
