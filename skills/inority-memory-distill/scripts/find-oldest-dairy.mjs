#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_WORKSPACE_ROOT, parseDateLikeStem } from "../../inority-memory/scripts/lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node find-oldest-dairy.mjs [directory] [--all] [--before YYYY-MM-DD] [--before-today]
`);
}

try {
  const argv = process.argv.slice(2);
  let directory = path.join(DEFAULT_WORKSPACE_ROOT, ".codex", "memory", "dairy");
  let all = false;
  let before = "";
  let beforeToday = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--before") {
      before = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--before-today") {
      beforeToday = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown argument: ${arg}`);
    } else {
      directory = arg;
    }
  }

  if (before && beforeToday) {
    throw new Error("use either --before or --before-today, not both");
  }
  if (before && !parseDateLikeStem(before)) {
    throw new Error(`invalid --before date: ${before}`);
  }

  const resolvedDir = path.resolve(directory);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`not a directory: ${resolvedDir}`);
  }

  let notes = fs
    .readdirSync(resolvedDir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => path.join(resolvedDir, name))
    .filter((file) => fs.statSync(file).isFile())
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  const cutoff = before || (beforeToday ? new Date().toISOString().slice(0, 10) : "");
  if (cutoff) {
    notes = notes.filter((note) => path.basename(note, ".md") < cutoff);
  }
  if (notes.length === 0) {
    throw new Error(`no dairy notes found under: ${resolvedDir}`);
  }

  if (all) {
    process.stdout.write(`${notes.join("\n")}\n`);
  } else {
    process.stdout.write(`${notes[0]}\n`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
