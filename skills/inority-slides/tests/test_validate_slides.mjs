import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { collectErrors, errorMessage, loadErrorCatalog } from "../scripts/commands/validate.mjs";
import { ERROR_CODE_CATALOG, loadText, SLIDES_TEMPLATE, SCRIPTS_DIR, runSlidesctl } from "./helpers.mjs";

test("slides reference template passes validation", async () => {
  assert.deepEqual(collectErrors(loadText(SLIDES_TEMPLATE)), []);
});

test("slides error code catalog covers runtime codes", async () => {
  const runtimeCodes = new Set((loadText(path.join(SCRIPTS_DIR, "commands", "validate.mjs")).match(/"(S\d{3})"/g) ?? []).map((item) => item.slice(1, -1)));
  runtimeCodes.add("S000");
  const catalog = loadErrorCatalog();
  assert.ok(loadText(ERROR_CODE_CATALOG).startsWith("S000:"));
  assert.ok([...runtimeCodes].every((code) => code in catalog));
  assert.equal(errorMessage("S001"), "首行必须是 slides 标题");
});

test("slidesctl validate fails when slide block misses svg", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "slides-validate-"));
  try {
    const slidesPath = path.join(dir, "invalid-slides.md");
    const invalid = loadText(SLIDES_TEMPLATE).replace("<svg viewBox=\"0 0 1200 720\" role=\"img\" aria-label=\"<Slide 1 名称> 线框图\">", "<!-- removed svg -->");
    writeFileSync(slidesPath, invalid, "utf8");
    const result = await runSlidesctl(["validate", slidesPath, "--json"]);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    const codes = new Set(payload.errors.map((item) => item.code));
    assert.ok(codes.has("S041"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("slidesctl validate help and pass output", async () => {
  let result = await runSlidesctl(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /slides planning CLI/);
  result = await runSlidesctl(["validate", SLIDES_TEMPLATE]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[slides-validator] PASS/);
});
