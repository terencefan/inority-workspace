#!/usr/bin/env node

import { readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

export const DEFAULT_EXCLUDES = new Set([
  ".git",
  ".codex",
  ".uv-cache",
  ".recycle",
  ".venv",
  "node_modules",
  "third_party",
]);

function parseArgs(argv) {
  let scanRoot = process.cwd();
  let format = "json";

  for (const arg of argv) {
    if (arg === "--json") {
      format = "json";
      continue;
    }
    if (arg === "--table") {
      format = "table";
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`unknown flag: ${arg}`);
    }
    scanRoot = resolve(arg);
  }

  return { scanRoot: resolve(scanRoot), format };
}

function runGit(repoPath, args) {
  return spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
  });
}

function gitOutput(repoPath, args) {
  const result = runGit(repoPath, args);
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
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

function parseRemote(url) {
  if (!url) {
    return { remoteHost: "-", remoteRepo: "-", forge: "none" };
  }

  let remoteHost = "-";
  let normalizedHost = "-";
  let candidatePath = url;

  if (url.includes("://")) {
    const parsed = new URL(url);
    remoteHost = parsed.host || "-";
    normalizedHost = parsed.hostname || "-";
    candidatePath = parsed.pathname || "";
  } else if (url.includes(":")) {
    const [hostPart, pathPart] = url.split(":", 2);
    remoteHost = hostPart.includes("@") ? hostPart.split("@").at(-1) ?? "-" : hostPart;
    normalizedHost = remoteHost;
    candidatePath = pathPart ?? "";
  }

  if (normalizedHost === "-" && remoteHost !== "-") {
    normalizedHost = remoteHost.split(":")[0] || remoteHost;
  }

  const parts = candidatePath.split("/").filter(Boolean);
  let remoteRepo = parts.at(-1) ?? "-";
  if (remoteRepo.endsWith(".git")) {
    remoteRepo = remoteRepo.slice(0, -4);
  }

  let forge = "unsupported";
  if (normalizedHost === "-") {
    forge = "none";
  } else if (normalizedHost === "github.com") {
    forge = "github";
  } else if (normalizedHost.includes("gitlab")) {
    forge = "gitlab";
  } else if (normalizedHost === "gitee.pjlab.org.cn") {
    forge = "gitee-enterprise";
  }

  return { remoteHost, remoteRepo: remoteRepo || "-", forge };
}

function classifyRepo(repo) {
  if (repo.dirtyCount === 0) {
    return "skip";
  }
  if (repo.branch === "(detached HEAD)") {
    return "ask";
  }
  if (repo.branch === "main" || repo.branch === "master") {
    return "ask";
  }
  if (repo.remoteHost === "-" || repo.forge === "none" || repo.forge === "unsupported") {
    return "ask";
  }
  return "publish";
}

function classifyDomain(forge) {
  switch (forge) {
    case "github":
      return "github";
    case "gitlab":
      return "gitlab";
    case "gitee-enterprise":
      return "gitee";
    case "none":
      return "none";
    default:
      return "unsupported";
  }
}

function suggestedSkillForDomain(domain) {
  switch (domain) {
    case "github":
      return "github:yeet";
    case "gitlab":
      return "git";
    case "gitee":
      return "create-gitee-enterprise-pr";
    default:
      return "-";
  }
}

export function repoRecord(repoPath) {
  const branch = gitOutput(repoPath, ["branch", "--show-current"]) || "(detached HEAD)";
  const statusOutput = gitOutput(repoPath, ["status", "--porcelain"]) || "";
  const dirtyCount = statusOutput ? statusOutput.split("\n").filter(Boolean).length : 0;
  const remoteUrl = gitOutput(repoPath, ["remote", "get-url", "origin"]) || "";
  const { remoteHost, remoteRepo, forge } = parseRemote(remoteUrl);
  const domain = classifyDomain(forge);

  return {
    path: repoPath,
    displayPath: displayPath(repoPath),
    branch,
    dirtyCount,
    remoteHost,
    remoteRepo,
    forge,
    domain,
    suggestedSkill: suggestedSkillForDomain(domain),
    proposedAction: "skip",
  };
}

async function isRepoRoot(targetPath) {
  try {
    const gitMeta = await stat(join(targetPath, ".git"));
    return gitMeta.isDirectory() || gitMeta.isFile();
  } catch {
    return false;
  }
}

export async function walkRepos(scanRoot) {
  const repos = [];
  const seen = new Set();
  const stack = [scanRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    if (await isRepoRoot(current)) {
      if (!seen.has(current)) {
        seen.add(current);
        repos.push(current);
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (DEFAULT_EXCLUDES.has(entry.name)) {
        continue;
      }
      stack.push(join(current, entry.name));
    }
  }

  repos.sort((left, right) => left.localeCompare(right));
  return repos;
}

function asciiTable(rows) {
  const headers = [
    "Repo",
    "Domain",
    "Remote Host",
    "Remote Repo",
    "Branch",
    "Dirty",
    "Action",
  ];
  const widths = headers.map((header) => header.length);

  for (const row of rows) {
    row.forEach((value, index) => {
      widths[index] = Math.max(widths[index], String(value).length);
    });
  }

  const border = () => `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const renderRow = (values) =>
    `| ${values.map((value, index) => String(value).padEnd(widths[index], " ")).join(" | ")} |`;

  return [border(), renderRow(headers), border(), ...rows.map(renderRow), border()].join("\n");
}

async function main() {
  const { scanRoot, format } = parseArgs(process.argv.slice(2));
  const rootStats = await stat(scanRoot).catch(() => null);
  if (!rootStats || !rootStats.isDirectory()) {
    throw new Error(`scan root does not exist or is not a directory: ${scanRoot}`);
  }

  const repos = await scanRepos(scanRoot);

  if (format === "table") {
    const rows = repos.map((repo) => [
      repo.displayPath,
      repo.domain,
      repo.remoteHost,
      repo.remoteRepo,
      repo.branch,
      repo.dirtyCount,
      repo.proposedAction,
    ]);
    console.log(asciiTable(rows));
    return;
  }

  console.log(
    JSON.stringify(
      {
        scanRoot,
        generatedFrom: displayPath(dirname(fileURLToPath(import.meta.url))),
        repos,
      },
      null,
      2,
    ),
  );
}

export async function scanRepos(scanRoot) {
  const repoPaths = await walkRepos(scanRoot);
  return repoPaths.map((repoPath) => {
    const repo = repoRecord(repoPath);
    repo.proposedAction = classifyRepo(repo);
    return repo;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
