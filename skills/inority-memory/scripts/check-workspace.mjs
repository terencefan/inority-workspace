#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_ROOT,
  SOURCE_MEMORY_DIR,
  TEMPLATES_DIR,
  isMainModule,
  parseFlagArgs,
  resolvePathMaybe,
  safeLstat,
  safeReadlinkReal,
} from "./lib.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node check-workspace.mjs [--workspace-root /path/to/workspace] [--json]
`);
}

function classifyPathKind(targetPath) {
  const stat = safeLstat(targetPath);
  if (!stat) {
    return "missing";
  }
  if (stat.isSymbolicLink()) {
    return "symlink";
  }
  if (stat.isDirectory()) {
    return "dir";
  }
  if (stat.isFile()) {
    return "file";
  }
  return "other";
}

function lineNumbersContaining(filePath, pattern) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(pattern)) {
      hits.push(i + 1);
    }
  }
  return hits;
}

function pushResult(results, level, code, message, details = {}) {
  results.push({ level, code, message, ...details });
}

function validateManagedLink(results, targetPath, expectedSource) {
  const kind = classifyPathKind(targetPath);
  if (kind === "missing") {
    pushResult(results, "error", "missing-managed-entry", `${targetPath} is missing`, {
      path: targetPath,
      expectedSource,
    });
    return;
  }
  if (kind !== "symlink") {
    pushResult(results, "error", "managed-entry-not-symlink", `${targetPath} should be a symlink`, {
      path: targetPath,
      actualKind: kind,
      expectedSource,
    });
    return;
  }

  const realTarget = safeReadlinkReal(targetPath);
  const realSource = resolvePathMaybe(expectedSource);
  if (!realTarget || !realSource || realTarget !== realSource) {
    pushResult(
      results,
      "error",
      "managed-entry-target-mismatch",
      `${targetPath} points to an unexpected source`,
      { path: targetPath, actualSource: realTarget, expectedSource: realSource || expectedSource },
    );
    return;
  }

  pushResult(results, "ok", "managed-entry-ok", `${targetPath} is linked correctly`, {
    path: targetPath,
    expectedSource: realSource,
  });
}

function validateLocalFile(results, targetPath) {
  const kind = classifyPathKind(targetPath);
  if (kind === "missing") {
    pushResult(results, "error", "missing-local-entry", `${targetPath} is missing`, { path: targetPath });
    return;
  }
  if (kind !== "file") {
    pushResult(results, "error", "local-entry-wrong-kind", `${targetPath} should be a regular file`, {
      path: targetPath,
      actualKind: kind,
    });
    return;
  }

  pushResult(results, "ok", "local-entry-ok", `${targetPath} exists`, { path: targetPath });
}

function validateDirectory(results, targetPath) {
  const kind = classifyPathKind(targetPath);
  if (kind === "missing") {
    pushResult(results, "error", "missing-directory", `${targetPath} is missing`, { path: targetPath });
    return;
  }
  if (kind !== "dir") {
    pushResult(results, "error", "wrong-directory-kind", `${targetPath} should be a directory`, {
      path: targetPath,
      actualKind: kind,
    });
    return;
  }

  pushResult(results, "ok", "directory-ok", `${targetPath} exists`, { path: targetPath });
}

export function runCheck(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const codexDir = path.join(workspaceRoot, ".codex");
  const memoryDir = path.join(codexDir, "memory");
  const agentsPath = path.join(workspaceRoot, "AGENTS.md");
  const results = [];

  validateDirectory(results, memoryDir);

  validateManagedLink(results, path.join(memoryDir, "SOUL.md"), path.join(SOURCE_MEMORY_DIR, "SOUL.md"));
  validateManagedLink(results, path.join(memoryDir, "USER.md"), path.join(SOURCE_MEMORY_DIR, "USER.md"));
  validateManagedLink(results, path.join(memoryDir, "README.md"), path.join(TEMPLATES_DIR, "runtime-memory-readme.md"));

  validateLocalFile(results, path.join(memoryDir, "WORKSPACE.md"));
  validateLocalFile(results, path.join(memoryDir, "credential.yaml"));

  validateDirectory(results, path.join(memoryDir, "dairy"));
  validateDirectory(results, path.join(memoryDir, "dairy", "archive"));

  const legacyEntrypoints = [
    ".codex/user.md",
    ".codex/memory.md",
    ".codex/workspace.md",
    ".codex/credential.md",
  ];
  for (const relativePath of legacyEntrypoints) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    if (fs.existsSync(absolutePath)) {
      pushResult(results, "warn", "legacy-entrypoint-present", `${relativePath} still exists`, {
        path: absolutePath,
      });
    } else {
      pushResult(results, "ok", "legacy-entrypoint-absent", `${relativePath} is absent`, {
        path: absolutePath,
      });
    }
  }

  if (!fs.existsSync(agentsPath)) {
    pushResult(results, "warn", "agents-missing", "AGENTS.md is missing", { path: agentsPath });
  } else {
    pushResult(results, "ok", "agents-present", "AGENTS.md exists", { path: agentsPath });
    const requiredReference = ".codex/memory/README.md";
    const requiredLines = lineNumbersContaining(agentsPath, requiredReference);
    if (requiredLines.length === 0) {
      pushResult(
        results,
        "warn",
        "agents-missing-runtime-reference",
        `AGENTS.md does not reference ${requiredReference}`,
        { path: agentsPath },
      );
    } else {
      pushResult(results, "ok", "agents-runtime-reference-ok", `AGENTS.md references ${requiredReference}`, {
        path: agentsPath,
        lines: requiredLines,
      });
    }

    for (const legacyPath of legacyEntrypoints) {
      const lines = lineNumbersContaining(agentsPath, legacyPath);
      if (lines.length > 0) {
        pushResult(results, "warn", "agents-legacy-reference", `AGENTS.md still references ${legacyPath}`, {
          path: agentsPath,
          legacyPath,
          lines,
        });
      }
    }
  }

  const counts = { ok: 0, warn: 0, error: 0 };
  for (const result of results) {
    counts[result.level] += 1;
  }

  return {
    workspaceRoot,
    memoryDir,
    healthy: counts.error === 0,
    counts,
    results,
  };
}

function formatHumanReport(report) {
  const lines = [];
  lines.push(`workspace_root: ${report.workspaceRoot}`);
  lines.push(`memory_dir: ${report.memoryDir}`);
  lines.push(`healthy: ${report.healthy ? "yes" : "no"}`);
  lines.push(`counts: ok=${report.counts.ok} warn=${report.counts.warn} error=${report.counts.error}`);

  for (const level of ["error", "warn", "ok"]) {
    const items = report.results.filter((item) => item.level === level);
    if (items.length === 0) {
      continue;
    }
    lines.push("");
    lines.push(`${level.toUpperCase()}:`);
    for (const item of items) {
      let extra = "";
      if (item.lines?.length) {
        extra = ` [lines ${item.lines.join(", ")}]`;
      } else if (item.expectedSource) {
        extra = ` [expected ${item.expectedSource}]`;
      }
      lines.push(`- ${item.message}${extra}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  const wantsJson = argv.includes("--json");
  const filteredArgv = argv.filter((arg) => arg !== "--json");
  const args = parseFlagArgs(filteredArgv, {
    "--workspace-root": "workspaceRoot",
  });
  if (args.help) {
    printHelp();
    return;
  }

  const report = runCheck({
    workspaceRoot: args.workspaceRoot,
  });

  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatHumanReport(report));
  }

  if (!report.healthy) {
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
