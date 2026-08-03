#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function readText(path) {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

function findUp(start, relativePath) {
  let current = resolve(start || process.cwd());
  const root = parse(current).root;
  while (true) {
    const candidate = join(current, relativePath);
    if (readText(candidate)) return candidate;
    if (current === root) return "";
    current = dirname(current);
  }
}

function candidateDirs(payload) {
  const values = [
    payload.cwd,
    payload.project_path,
    payload.projectPath,
    payload.workspace_root,
    payload.workspaceRoot,
    process.cwd(),
  ];
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function resolveMemoryDir(payload) {
  for (const dir of candidateDirs(payload)) {
    const entry = findUp(dir, ".codex/memory/MEMORY.md");
    if (entry) return dirname(entry);
  }
  const fallback = join(process.env.CODEX_HOME || join(process.env.HOME || "", ".codex"), "memory");
  return readText(join(fallback, "MEMORY.md")) ? fallback : "";
}

function resolveProjectMemory(payload, workspaceMemoryDir) {
  for (const dir of candidateDirs(payload)) {
    const project = findUp(dir, ".codex/memory/PROJECT.md");
    if (project && dirname(project) !== workspaceMemoryDir) return project;
  }
  return "";
}

function detectEvent(payload) {
  for (const key of ["hook_event_name", "hookEventName", "event", "name"]) {
    if (typeof payload[key] === "string" && payload[key].trim()) return payload[key].trim();
  }
  return "SessionStart";
}

function payloadString(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return "";
}

function detectHost(payload) {
  const originator = String(process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE || "").toLowerCase();
  const payloadHost = payloadString(payload, [
    "originator", "originatorOverride", "clientName", "hostInterface", "host",
  ]);
  if (originator === "codex desktop" || payloadHost.includes("codex desktop")) return "md";
  if (
    process.env.VSCODE_IPC_HOOK_CLI || process.env.VSCODE_GIT_IPC_HANDLE ||
    process.env.VSCODE_PID || process.env.CURSOR_TRACE_ID ||
    ["vscode", "cursor"].includes(String(process.env.TERM_PROGRAM || "").toLowerCase()) ||
    payloadHost.includes("cursor") || payloadHost.includes("vscode") ||
    payloadHost.includes("visual studio code")
  ) return "md";
  if (
    process.stdin.isTTY || process.stdout.isTTY || process.env.TERM ||
    process.env.COLORTERM || process.env.TERM_PROGRAM || process.env.WT_SESSION ||
    process.env.TMUX
  ) return "cli";
  return "unknown";
}

function replyTemplate(host) {
  const name = host === "cli" ? "reply-format-cli.md" : "reply-format-md.md";
  return readText(join(pluginRoot, "skills", "inority-reply", "references", name));
}

function memoryContext(payload) {
  const memoryDir = resolveMemoryDir(payload);
  if (!memoryDir) {
    return "CODEX INORITY MEMORY LOAD FAILED: no .codex/memory/MEMORY.md was discovered. Do not claim workspace memory is loaded.";
  }

  const names = ["MEMORY.md", "USER.md", "SOUL.md", "WORKSPACE.md", "credential.md"];
  const sections = [];
  const loaded = [];
  for (const name of names) {
    const path = join(memoryDir, name);
    const content = readText(path);
    if (!content) continue;
    loaded.push(path);
    sections.push(`## BEGIN ${path}\n${content}\n## END ${path}`);
  }

  const projectPath = resolveProjectMemory(payload, memoryDir);
  const projectContent = projectPath ? readText(projectPath) : "";
  if (projectContent) {
    loaded.push(projectPath);
    sections.push(`## BEGIN ${projectPath}\n${projectContent}\n## END ${projectPath}`);
  }

  const body = sections.join("\n\n");
  const digest = createHash("sha256").update(body).digest("hex");
  return [
    "Codex Inority loaded the following memory files before this session:",
    ...loaded.map((path) => `- ${path}`),
    `memory_payload_sha256: ${digest}`,
    "Treat the injected contents below as active workspace context. Follow MEMORY.md loading and disclosure rules.",
    body,
  ].join("\n");
}

const payload = parseJson(await readStdin());
const event = detectEvent(payload);
const host = detectHost(payload);
const context = memoryContext(payload);
const template = replyTemplate(host);
const refreshLine = event === "UserPromptSubmit"
  ? "Codex Inority refreshed the complete core-memory payload for this prompt so context compaction cannot leave only a stale reminder."
  : "Codex Inority loaded the complete core-memory payload at session start.";
const additionalContext = template
  ? `${refreshLine}\n\n${context}\n\nDetected host interface: ${host}. Apply this reply template:\n\n${template}`
  : `${refreshLine}\n\n${context}`;

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: event,
    additionalContext,
  },
})}\n`);
