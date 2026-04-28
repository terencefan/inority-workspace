#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  SOURCE_MEMORY_README,
  SOURCE_MEMORY_DIR,
  TEMPLATES_DIR,
  ensureManagedCopy,
  ensureTemplateFile,
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
  const backupSoul = ensureTemplateFile(
    path.join(TEMPLATES_DIR, "SOUL.template.md"),
    path.join(memoryDir, "SOUL.md"),
    timestamp,
    { replaceIfMatches: [path.join(SOURCE_MEMORY_DIR, "SOUL.md")] },
  );
  const backupUser = ensureTemplateFile(
    path.join(TEMPLATES_DIR, "USER.template.md"),
    path.join(memoryDir, "USER.md"),
    timestamp,
    { replaceIfMatches: [path.join(SOURCE_MEMORY_DIR, "USER.md")] },
  );
  const memoryFile = path.join(memoryDir, "MEMORY.md");
  if (!fs.existsSync(memoryFile)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "runtime-memory-entry.md"), memoryFile);
  }
  const readmeFile = path.join(memoryDir, "README.md");
  const backupReadme = ensureManagedCopy(SOURCE_MEMORY_README, readmeFile, timestamp);

  const backupWorkspace = ensureTemplateFile(
    path.join(TEMPLATES_DIR, "WORKSPACE.template.md"),
    path.join(memoryDir, "WORKSPACE.md"),
    timestamp,
  );

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
    MANAGED_README_SOURCE: SOURCE_MEMORY_README,
    BACKUP_SOUL: backupSoul,
    BACKUP_USER: backupUser,
    BACKUP_README: backupReadme,
    BACKUP_WORKSPACE: backupWorkspace,
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
  managed_files: README.md
  templated_files: SOUL.md USER.md WORKSPACE.md MEMORY.md
  local_only_files: credential.yaml dairy/
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
