import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { SKELETON_TEMPLATE } from "../scripts/commands/init.mjs";
import { runSlidesctl } from "./helpers.mjs";

test("slidesctl init creates template file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "slides-init-"));
  try {
    const slidesPath = path.join(dir, "authority.md");
    const result = await runSlidesctl(["init", slidesPath]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(slidesPath, "utf8"), SKELETON_TEMPLATE);
    assert.match(readFileSync(slidesPath, "utf8"), /默认实现模板：`inority-slides\/assets\/demo\/`/);
    assert.match(readFileSync(slidesPath, "utf8"), /标题：/);
    assert.match(readFileSync(slidesPath, "utf8"), /文案：/);
    assert.match(readFileSync(slidesPath, "utf8"), /SVG 图：/);
    assert.match(readFileSync(slidesPath, "utf8"), /SVG 灯箱预览：\[点击在 handbook 中预览]\(/);
    assert.match(readFileSync(slidesPath, "utf8"), /当前 slide 类型：/);
    assert.match(readFileSync(slidesPath, "utf8"), /章节标题页/);
    assert.match(readFileSync(slidesPath, "utf8"), /#### 致谢/);
    assert.match(result.stdout, /\[slides-init] created/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("built-in demo template exists inside skill assets", () => {
  const demoDir = path.resolve("/home/fantengyuan/workspace/inority-workspace/skills/inority-slides/assets/demo");
  assert.equal(existsSync(path.join(demoDir, "index.html")), true);
  assert.equal(existsSync(path.join(demoDir, "src", "main.js")), true);
  assert.match(readFileSync(path.join(demoDir, "package.json"), "utf8"), /"name": "slides-demo"/);
});

test("slidesctl init supports title substitution and force overwrite", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "slides-init-"));
  try {
    const slidesPath = path.join(dir, "authority.md");
    let result = await runSlidesctl(["init", slidesPath, "--title", "Canary Slides Plan"]);
    assert.equal(result.status, 0);
    assert.ok(readFileSync(slidesPath, "utf8").startsWith("# Canary Slides Plan\n"));

    writeFileSync(slidesPath, "existing\n", "utf8");
    result = await runSlidesctl(["init", slidesPath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /target file already exists/);

    result = await runSlidesctl(["init", slidesPath, "--title", "Fresh Slides Plan", "--force"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\[slides-init] overwrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
