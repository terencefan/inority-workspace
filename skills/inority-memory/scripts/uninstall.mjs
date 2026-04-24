#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  SOURCE_MEMORY_DIR,
  TEMPLATES_DIR,
  isMainModule,
  parseFlagArgs,
  readManifest,
  restoreOrRemove,
} from "./lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node uninstall.mjs [--workspace-root /path/to/workspace]
`);
}

export function runUninstall(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const memoryDir = path.join(workspaceRoot, ".codex", "memory");
  const manifestPath = path.join(memoryDir, ".inority-memory-install.jsonl");
  const manifest = readManifest(manifestPath);

  restoreOrRemove(path.join(memoryDir, "SOUL.md"), path.join(SOURCE_MEMORY_DIR, "SOUL.md"), manifest.BACKUP_SOUL);
  restoreOrRemove(path.join(memoryDir, "USER.md"), path.join(SOURCE_MEMORY_DIR, "USER.md"), manifest.BACKUP_USER);
  restoreOrRemove(path.join(memoryDir, "README.md"), path.join(TEMPLATES_DIR, "runtime-memory-readme.md"), manifest.BACKUP_README);
  fs.rmSync(manifestPath, { force: true });

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

  const { workspaceRoot, memoryDir } = runUninstall({ workspaceRoot: args.workspaceRoot });

  process.stdout.write(`Uninstalled inority-memory package.
  workspace_root: ${workspaceRoot}
  memory_dir: ${memoryDir}
  preserved_local_only_files: WORKSPACE.md credential.yaml dairy/
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
