#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  isMainModule,
  parseDateLikeStem,
  parseFlagArgs,
  resolvePathMaybe,
} from "../../inority-memory/scripts/lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node scan-md.mjs [options]

Options:
  --source-root /path/to/legacy-workspace-or-codex-root
  --json
`);
}

function parseCliArgs(argv) {
  const json = argv.includes("--json");
  const filtered = argv.filter((arg) => arg !== "--json");
  const args = parseFlagArgs(filtered, {
    "--source-root": "sourceRoot",
  });
  args.json = json;
  return args;
}

function detectCodexRoot(sourceRoot) {
  const direct = sourceRoot;
  const nested = path.join(sourceRoot, ".codex");
  for (const candidate of [direct, nested]) {
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
      continue;
    }
    if (
      fs.existsSync(path.join(candidate, "user.md")) ||
      fs.existsSync(path.join(candidate, "memory.md")) ||
      fs.existsSync(path.join(candidate, "workspace.md")) ||
      fs.existsSync(path.join(candidate, "credential.md")) ||
      fs.existsSync(path.join(candidate, "memory"))
    ) {
      return candidate;
    }
  }
  throw new Error(`could not find a legacy .codex root under: ${sourceRoot}`);
}

function scanLegacyMdSources(codexRoot) {
  const files = {
    user: resolvePathMaybe(path.join(codexRoot, "user.md")),
    memory: resolvePathMaybe(path.join(codexRoot, "memory.md")),
    workspace: resolvePathMaybe(path.join(codexRoot, "workspace.md")),
    credential: resolvePathMaybe(path.join(codexRoot, "credential.md")),
  };

  const dairyDir = resolvePathMaybe(path.join(codexRoot, "memory"));
  const dairyNotes = [];
  if (dairyDir && fs.statSync(dairyDir).isDirectory()) {
    for (const name of fs.readdirSync(dairyDir).sort()) {
      if (!name.endsWith(".md")) {
        continue;
      }
      const stem = name.replace(/\.md$/i, "");
      if (!parseDateLikeStem(stem)) {
        continue;
      }
      const notePath = path.join(dairyDir, name);
      if (!fs.statSync(notePath).isFile()) {
        continue;
      }
      dairyNotes.push(notePath);
    }
  }

  return {
    codexRoot,
    files,
    dairyDir,
    dairyNotes,
  };
}

function printTextSummary(summary) {
  const lines = [
    "Markdown scan completed.",
    `  codex_root: ${summary.codexRoot}`,
    "  detected_files:",
    `    - user.md: ${summary.files.user || "none"}`,
    `    - memory.md: ${summary.files.memory || "none"}`,
    `    - workspace.md: ${summary.files.workspace || "none"}`,
    `    - credential.md: ${summary.files.credential || "none"}`,
    `  dairy_dir: ${summary.dairyDir || "none"}`,
    `  dairy_notes: ${summary.dairyNotes.length}`,
  ];
  for (const note of summary.dairyNotes) {
    lines.push(`    - ${note}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

export async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const sourceRoot = path.resolve(args.sourceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const codexRoot = detectCodexRoot(sourceRoot);
  const summary = scanLegacyMdSources(codexRoot);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  printTextSummary(summary);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
