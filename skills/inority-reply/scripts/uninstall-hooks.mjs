#!/usr/bin/env node

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const args = { codexHome: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--codex-home") {
      args.codexHome = argv[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!args.codexHome) {
    throw new Error("usage: uninstall-hooks.mjs --codex-home <path>");
  }

  return resolve(args.codexHome);
}

function isManagedReplyFormatCommand(command) {
  return typeof command === "string" && /(?:^|[\\/])native-hook-with-host-context\.mjs(?:["'\s]|$)/.test(command);
}

function stripManagedHooks(entries) {
  if (!Array.isArray(entries)) {
    return { entries: [], removedCount: 0 };
  }

  const preservedEntries = [];
  let removedCount = 0;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.hooks)) {
      preservedEntries.push(entry);
      continue;
    }

    const nextHooks = entry.hooks.filter((hook) => {
      if (!hook || typeof hook !== "object") {
        return true;
      }

      return !(hook.type === "command" && isManagedReplyFormatCommand(hook.command));
    });
    removedCount += entry.hooks.length - nextHooks.length;

    if (nextHooks.length > 0) {
      preservedEntries.push({ ...entry, hooks: nextHooks });
    }
  }

  return { entries: preservedEntries, removedCount };
}

const codexHome = parseArgs(process.argv.slice(2));
const hooksPath = join(codexHome, "hooks.json");

if (!existsSync(hooksPath)) {
  process.exit(0);
}

const raw = readFileSync(hooksPath, "utf8").trim();
if (!raw) {
  rmSync(hooksPath, { force: true });
  process.exit(0);
}

const config = JSON.parse(raw);
if (!config || typeof config !== "object" || !config.hooks || typeof config.hooks !== "object") {
  process.exit(0);
}

const nextHooks = { ...config.hooks };
let changed = false;

for (const eventName of ["SessionStart", "UserPromptSubmit"]) {
  const stripped = stripManagedHooks(nextHooks[eventName]);
  if (stripped.removedCount > 0) {
    changed = true;
  }

  if (stripped.entries.length > 0) {
    nextHooks[eventName] = stripped.entries;
  } else {
    delete nextHooks[eventName];
  }
}

if (!changed) {
  process.exit(0);
}

const nextConfig = { ...config };
if (Object.keys(nextHooks).length > 0) {
  nextConfig.hooks = nextHooks;
  writeFileSync(hooksPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
} else {
  delete nextConfig.hooks;
  if (Object.keys(nextConfig).length > 0) {
    writeFileSync(hooksPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
  } else {
    rmSync(hooksPath, { force: true });
  }
}
