#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const args = { codexHome: "", wrapperPath: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--codex-home") {
      args.codexHome = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--wrapper-path") {
      args.wrapperPath = argv[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!args.codexHome || !args.wrapperPath) {
    throw new Error("usage: install-hooks.mjs --codex-home <path> --wrapper-path <path>");
  }

  return {
    codexHome: resolve(args.codexHome),
    wrapperPath: resolve(args.wrapperPath),
  };
}

function readJsonFile(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }

  const raw = readFileSync(path, "utf8").trim();
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw);
}

function isManagedReplyFormatCommand(command) {
  return typeof command === "string" && /(?:^|[\\/])native-hook-with-host-context\.mjs(?:["'\s]|$)/.test(command);
}

function stripManagedHooks(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const preservedEntries = [];
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

    if (nextHooks.length > 0) {
      preservedEntries.push({ ...entry, hooks: nextHooks });
    }
  }

  return preservedEntries;
}

function buildSessionStartEntry(command) {
  return {
    matcher: "startup|resume",
    hooks: [
      {
        type: "command",
        command,
        statusMessage: "Applying reply-format session-start context",
      },
    ],
  };
}

function buildPromptSubmitEntry(command) {
  return {
    hooks: [
      {
        type: "command",
        command,
        statusMessage: "Applying reply-format prompt context",
      },
    ],
  };
}

const { codexHome, wrapperPath } = parseArgs(process.argv.slice(2));
const hooksPath = join(codexHome, "hooks.json");
const config = readJsonFile(hooksPath, {});
const nextConfig = config && typeof config === "object" ? { ...config } : {};
const nextHooks = nextConfig.hooks && typeof nextConfig.hooks === "object" ? { ...nextConfig.hooks } : {};
const command = `node "${wrapperPath}"`;

nextHooks.SessionStart = [
  ...stripManagedHooks(nextHooks.SessionStart),
  buildSessionStartEntry(command),
];
nextHooks.UserPromptSubmit = [
  ...stripManagedHooks(nextHooks.UserPromptSubmit),
  buildPromptSubmitEntry(command),
];

nextConfig.hooks = nextHooks;
mkdirSync(codexHome, { recursive: true });
writeFileSync(hooksPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
