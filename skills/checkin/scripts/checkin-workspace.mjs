#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { walkRepos } from "../../inority/scripts/scan-git-repos.mjs";

function parseArgs(argv) {
  let scanRoot = process.cwd();
  let format = "json";
  let apply = false;

  for (const arg of argv) {
    if (arg === "--json") {
      format = "json";
      continue;
    }
    if (arg === "--table") {
      format = "table";
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`unknown flag: ${arg}`);
    }
    scanRoot = resolve(arg);
  }

  return { scanRoot: resolve(scanRoot), format, apply };
}

function runGit(repoPath, args) {
  return spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
  });
}

function gitOutput(repoPath, args) {
  const result = runGit(repoPath, args);
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim();
}

function hasRebaseOrMergeInProgress(repoPath) {
  const checks = [
    ["rev-parse", "--git-path", "rebase-merge"],
    ["rev-parse", "--git-path", "rebase-apply"],
    ["rev-parse", "--git-path", "MERGE_HEAD"],
  ];

  for (const args of checks) {
    const relPath = gitOutput(repoPath, args);
    if (!relPath) {
      continue;
    }
    const target = resolve(repoPath, relPath);
    if (existsSync(target)) {
      return true;
    }
  }

  return false;
}

function displayPath(targetPath) {
  const home = resolve(homedir());
  if (targetPath === home) {
    return "~";
  }
  if (targetPath.startsWith(`${home}/`)) {
    return `~/${targetPath.slice(home.length + 1)}`;
  }
  return targetPath;
}

function branchExists(repoPath, branchName, remote = false) {
  const ref = remote
    ? `refs/remotes/origin/${branchName}`
    : `refs/heads/${branchName}`;
  return runGit(repoPath, ["show-ref", "--verify", "--quiet", ref]).status === 0;
}

function detectDefaultBranch(repoPath) {
  const originHead = gitOutput(repoPath, [
    "symbolic-ref",
    "--quiet",
    "--short",
    "refs/remotes/origin/HEAD",
  ]);
  if (originHead.startsWith("origin/")) {
    return originHead.slice("origin/".length);
  }

  for (const candidate of ["main", "master"]) {
    if (branchExists(repoPath, candidate, true)) {
      return candidate;
    }
  }

  for (const candidate of ["main", "master"]) {
    if (branchExists(repoPath, candidate, false)) {
      return candidate;
    }
  }

  return "";
}

function repoRecord(repoPath) {
  const currentBranch = gitOutput(repoPath, ["branch", "--show-current"]) || "(detached HEAD)";
  const dirtyOutput = gitOutput(repoPath, ["status", "--porcelain"]);
  const dirtyCount = dirtyOutput ? dirtyOutput.split("\n").filter(Boolean).length : 0;
  const hasOrigin = runGit(repoPath, ["remote", "get-url", "origin"]).status === 0;
  const defaultBranch = detectDefaultBranch(repoPath);
  const hasInProgressState = hasRebaseOrMergeInProgress(repoPath);

  let status = "ready";
  let reason = "";

  if (!hasOrigin) {
    status = "blocked";
    reason = "missing origin remote";
  } else if (currentBranch === "(detached HEAD)") {
    status = "blocked";
    reason = "detached HEAD";
  } else if (dirtyCount > 0) {
    status = "blocked";
    reason = "dirty worktree";
  } else if (hasInProgressState) {
    status = "blocked";
    reason = "rebase or merge already in progress";
  } else if (!defaultBranch) {
    status = "blocked";
    reason = "cannot determine default branch";
  }

  return {
    path: repoPath,
    displayPath: displayPath(repoPath),
    currentBranch,
    defaultBranch: defaultBranch || "-",
    dirtyCount,
    hasOrigin,
    status,
    reason,
    action: "plan",
    result: status === "ready" ? "pending" : "skipped",
  };
}

function asciiTable(records) {
  const headers = [
    "Repo",
    "Current",
    "Default",
    "Dirty",
    "Status",
    "Action",
    "Result",
    "Reason",
  ];
  const rows = records.map((record) => [
    record.displayPath,
    record.currentBranch,
    record.defaultBranch,
    String(record.dirtyCount),
    record.status,
    record.action,
    record.result,
    record.reason || "-",
  ]);

  const widths = headers.map((header) => header.length);
  for (const row of rows) {
    row.forEach((value, index) => {
      widths[index] = Math.max(widths[index], value.length);
    });
  }

  const divider = widths.map((width) => "-".repeat(width)).join("-+-");
  const lines = [
    headers.map((header, index) => header.padEnd(widths[index])).join(" | "),
    divider,
  ];

  for (const row of rows) {
    lines.push(row.map((value, index) => value.padEnd(widths[index])).join(" | "));
  }

  return lines.join("\n");
}

function applyRepo(record) {
  if (record.status !== "ready") {
    return record;
  }

  const updated = { ...record };
  updated.action = "fetch+rebase";

  const fetchResult = runGit(updated.path, ["fetch", "origin", "--prune"]);
  if (fetchResult.status !== 0) {
    updated.status = "failed";
    updated.result = "halted";
    updated.reason = (fetchResult.stderr || fetchResult.stdout || "git fetch failed").trim();
    return updated;
  }

  const refreshedDefault = detectDefaultBranch(updated.path);
  if (!refreshedDefault) {
    updated.status = "failed";
    updated.result = "halted";
    updated.reason = "cannot determine default branch after fetch";
    return updated;
  }
  updated.defaultBranch = refreshedDefault;

  const remoteRef = `origin/${updated.defaultBranch}`;
  if (runGit(updated.path, ["show-ref", "--verify", "--quiet", `refs/remotes/${remoteRef}`]).status !== 0) {
    updated.status = "failed";
    updated.result = "halted";
    updated.reason = `missing remote ref ${remoteRef}`;
    return updated;
  }

  if (updated.currentBranch !== updated.defaultBranch) {
    const branchResult = runGit(updated.path, [
      "branch",
      "-f",
      updated.defaultBranch,
      remoteRef,
    ]);
    if (branchResult.status !== 0) {
      updated.status = "failed";
      updated.result = "halted";
      updated.reason = (branchResult.stderr || branchResult.stdout || "failed to refresh local default branch").trim();
      return updated;
    }
  }

  const rebaseResult = runGit(updated.path, ["rebase", remoteRef]);
  if (rebaseResult.status !== 0) {
    updated.status = "failed";
    updated.result = "halted";
    updated.reason = (rebaseResult.stderr || rebaseResult.stdout || "git rebase failed").trim();
    return updated;
  }

  updated.result = "updated";
  updated.reason = "";
  return updated;
}

async function main() {
  const { scanRoot, format, apply } = parseArgs(process.argv.slice(2));
  const repoPaths = await walkRepos(scanRoot);
  const records = repoPaths.map(repoRecord);

  if (apply) {
    for (let index = 0; index < records.length; index += 1) {
      const current = records[index];
      const updated = applyRepo(current);
      records[index] = updated;
      if (updated.result === "halted") {
        break;
      }
    }
  }

  if (format === "table") {
    process.stdout.write(`${asciiTable(records)}\n`);
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        scanRoot: resolve(scanRoot),
        apply,
        repositories: records,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
