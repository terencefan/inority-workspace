import assert from "node:assert/strict";
import path from "node:path";
import { ASSETS_DIR, SCRIPTS_DIR, loadText } from "./helpers.mjs";
import {
  collectDotDiagnostics,
  collectMarkdownDotDiagnostics,
  errorMessage,
  loadErrorCatalog,
  main,
} from "../scripts/dotctl.mjs";

function mutate(text, oldValue, newValue) {
  assert.ok(text.includes(oldValue), `mutation target not found: ${oldValue}`);
  return text.replace(oldValue, newValue);
}

const referenceDot = loadText(path.join(ASSETS_DIR, "reference.dot"));
const referenceMarkdown = loadText(path.join(ASSETS_DIR, "reference.md"));

function runCase(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error);
    process.exitCode = 1;
  }
}

runCase("reference dot passes shared validator", () => {
  const diagnostics = collectDotDiagnostics(referenceDot);
  assert.deepEqual(diagnostics.errors, []);
});

runCase("reference markdown passes shared validator", () => {
  const diagnostics = collectMarkdownDotDiagnostics(referenceMarkdown);
  assert.deepEqual(diagnostics.errors, []);
});

runCase("missing node fillcolor is rejected", () => {
  const mutated = mutate(referenceDot, 'fillcolor="#f8fafc"', "");
  const codes = new Set(collectDotDiagnostics(mutated, { render: false }).errors.map((item) => item.code));
  assert.ok(codes.has("D015"));
});

runCase("cluster without fontcolor is rejected", () => {
  const mutated = mutate(referenceDot, '    fontcolor="#475569";\n', "");
  const codes = new Set(collectDotDiagnostics(mutated, { render: false }).errors.map((item) => item.code));
  assert.ok(codes.has("D031"));
});

runCase("arial is rejected", () => {
  const mutated = mutate(referenceDot, 'fontname="Noto Sans CJK SC"', 'fontname="Arial"');
  const codes = new Set(collectDotDiagnostics(mutated, { render: false }).errors.map((item) => item.code));
  assert.ok(codes.has("D004"));
});

runCase("missing markdown block is rejected by markdown mode", () => {
  const diagnostics = collectMarkdownDotDiagnostics("# empty\n", { render: false });
  const codes = new Set(diagnostics.errors.map((item) => item.code));
  assert.ok(codes.has("D040"));
});

runCase("catalog covers runtime codes", () => {
  const catalog = loadErrorCatalog();
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "dotctl.mjs")).match(/"(D\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(errorMessage("D010"), 'Markdown 内嵌 DOT 图必须显式设置透明背景 `bgcolor="transparent"`');
});

runCase("cli validate-markdown returns success for reference markdown", () => {
  let stdout = "";
  let stderr = "";
  const status = main(["validate-markdown", path.join(ASSETS_DIR, "reference.md")], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
  });
  assert.equal(status, 0);
  assert.match(stdout, /dot ok:/);
  assert.equal(stderr.includes("D090"), false);
});
