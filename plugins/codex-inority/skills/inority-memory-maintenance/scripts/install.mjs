#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  TEMPLATES_DIR,
  isMainModule,
  mkdirp,
  parseFlagArgs,
} from "./lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node install.mjs [--workspace-root /path/to/workspace] [--source-memory-dir /path/to/memory]
`);
}

function ensureSourceLink(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`missing maintained memory source: ${sourcePath}`);
  }
  const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
  if (stat) {
    if (stat.isSymbolicLink() && fs.realpathSync(targetPath) === fs.realpathSync(sourcePath)) {
      return "unchanged";
    }
    throw new Error(`${targetPath} must be a symlink to ${sourcePath}; existing content was preserved`);
  }
  const relativeSource = path.relative(path.dirname(targetPath), sourcePath);
  fs.symlinkSync(relativeSource, targetPath, "file");
  return "linked";
}

export function runInstall(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const sourceMemoryDir = path.resolve(
    options.sourceMemoryDir ?? path.join(workspaceRoot, "inority-workspace", "memory"),
  );
  const memoryDir = path.join(workspaceRoot, ".codex", "memory");

  mkdirp(memoryDir);
  mkdirp(path.join(memoryDir, "dairy", "archive"));

  const linkResults = {
    SOUL: ensureSourceLink(path.join(sourceMemoryDir, "SOUL.md"), path.join(memoryDir, "SOUL.md")),
    USER: ensureSourceLink(path.join(sourceMemoryDir, "USER.md"), path.join(memoryDir, "USER.md")),
  };

  const localTemplates = [
    ["WORKSPACE.template.md", "WORKSPACE.md"],
    ["runtime-memory-entry.md", "MEMORY.md"],
    ["credential.template.md", "credential.md"],
  ];
  for (const [templateName, targetName] of localTemplates) {
    const targetPath = path.join(memoryDir, targetName);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(path.join(TEMPLATES_DIR, templateName), targetPath);
    }
  }

  fs.mkdirSync(path.join(memoryDir, "credential.d"), { recursive: true });

  return { workspaceRoot, sourceMemoryDir, memoryDir, linkResults };
}

function main() {
  const args = parseFlagArgs(process.argv.slice(2), {
    "--workspace-root": "workspaceRoot",
    "--source-memory-dir": "sourceMemoryDir",
  });
  if (args.help) {
    printHelp();
    return;
  }

  const { workspaceRoot, sourceMemoryDir, memoryDir, linkResults } = runInstall(args);

  process.stdout.write(`Installed inority-memory-maintenance package.
  workspace_root: ${workspaceRoot}
  source_memory_dir: ${sourceMemoryDir}
  memory_dir: ${memoryDir}
  source_links: SOUL=${linkResults.SOUL} USER=${linkResults.USER}
  runtime_files: MEMORY.md SOUL.md USER.md WORKSPACE.md credential.md credential.d/ dairy/
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
