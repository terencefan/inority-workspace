#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  SOURCE_MEMORY_DIR,
  TEMPLATES_DIR,
  ensureManagedLink,
  isMainModule,
  isoNow,
  mkdirp,
  parseFlagArgs,
  writeManifest,
} from "./lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node install.mjs [--workspace-root /path/to/workspace]
`);
}

export function runInstall(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const memoryDir = path.join(workspaceRoot, ".codex", "memory");
  const manifestPath = path.join(memoryDir, ".inority-memory-install.jsonl");

  mkdirp(memoryDir);
  mkdirp(path.join(memoryDir, "dairy", "archive"));

  const timestamp = new Date().toISOString();
  const backupSoul = ensureManagedLink(path.join(SOURCE_MEMORY_DIR, "SOUL.md"), path.join(memoryDir, "SOUL.md"), timestamp);
  const backupUser = ensureManagedLink(path.join(SOURCE_MEMORY_DIR, "USER.md"), path.join(memoryDir, "USER.md"), timestamp);
  const memoryFile = path.join(memoryDir, "MEMORY.md");
  if (!fs.existsSync(memoryFile)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "runtime-memory-entry.md"), memoryFile);
  }

  const workspaceFile = path.join(memoryDir, "WORKSPACE.md");
  if (!fs.existsSync(workspaceFile)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "WORKSPACE.template.md"), workspaceFile);
  }

  const credentialFile = path.join(memoryDir, "credential.yaml");
  if (!fs.existsSync(credentialFile)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "credential.template.yaml"), credentialFile);
  }

  writeManifest(manifestPath, {
    INSTALLED_AT: isoNow(),
    WORKSPACE_ROOT: workspaceRoot,
    MEMORY_DIR: memoryDir,
    MANAGED_SOUL_SOURCE: path.join(SOURCE_MEMORY_DIR, "SOUL.md"),
    MANAGED_USER_SOURCE: path.join(SOURCE_MEMORY_DIR, "USER.md"),
    BACKUP_SOUL: backupSoul,
    BACKUP_USER: backupUser,
  });

  return { workspaceRoot, memoryDir };
}

function main() {
  const args = parseFlagArgs(process.argv.slice(2), {
    "--workspace-root": "workspaceRoot",
  });
  if (args.help) {
    printHelp();
    return;
  }

  const { workspaceRoot, memoryDir } = runInstall({ workspaceRoot: args.workspaceRoot });

  process.stdout.write(`Installed inority-memory package.
  workspace_root: ${workspaceRoot}
  memory_dir: ${memoryDir}
  managed_files: SOUL.md USER.md
  local_only_files: MEMORY.md WORKSPACE.md credential.yaml dairy/
`);
}

if (isMainModule(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
