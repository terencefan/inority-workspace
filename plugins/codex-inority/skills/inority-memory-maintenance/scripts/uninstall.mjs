#!/usr/bin/env node

import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  isMainModule,
  parseFlagArgs,
} from "./lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node uninstall.mjs [--workspace-root /path/to/workspace]
`);
}

export function runUninstall(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const memoryDir = path.join(workspaceRoot, ".codex", "memory");
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

  process.stdout.write(`Uninstalled inority-memory-maintenance package.
  workspace_root: ${workspaceRoot}
  memory_dir: ${memoryDir}
  action: no runtime memory files removed
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
