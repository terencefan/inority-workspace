#!/usr/bin/env node

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = mkdtempSync(join(tmpdir(), "codex-inority-test-"));
const memoryDir = join(fixtureRoot, ".codex", "memory");

try {
  mkdirSync(memoryDir, { recursive: true });
  writeFileSync(join(memoryDir, "MEMORY.md"), "Load USER.md for user context.\n");
  writeFileSync(join(memoryDir, "USER.md"), "# User\n\nName: Plugin Fixture User\n");

  const hookConfig = JSON.parse(readFileSync(join(pluginRoot, "hooks", "hooks.json"), "utf8"));
  const command = hookConfig.hooks.SessionStart[0].hooks[0].command;
  const payload = JSON.stringify({ hook_event_name: "SessionStart", cwd: fixtureRoot });
  const result = spawnSync("sh", ["-c", command], {
    cwd: tmpdir(),
    env: { ...process.env, PLUGIN_ROOT: pluginRoot, TERM: "xterm" },
    input: payload,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`hook exited ${result.status}: ${result.stderr.trim()}`);
  }
  if (!result.stdout.trim()) {
    throw new Error(`hook returned no output: ${result.stderr.trim()}`);
  }

  const output = JSON.parse(result.stdout);
  const context = output?.hookSpecificOutput?.additionalContext || "";
  if (output?.hookSpecificOutput?.hookEventName !== "SessionStart") {
    throw new Error("hook output did not preserve the event name");
  }
  if (!context.includes("Plugin Fixture User")) {
    throw new Error("hook output did not include workspace memory");
  }
  if (!context.includes("Detected host interface: cli")) {
    throw new Error("hook output did not include the plugin-relative CLI template");
  }

  console.log("codex-inority hook test passed");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
