#!/usr/bin/env node

import { dirname, join, parse, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const DETECT_SCRIPT = join(SCRIPT_DIR, "detect-host-interface.sh");
const CLI_TEMPLATE = join(PACKAGE_ROOT, "references", "reply-format-cli.md");
const MD_TEMPLATE = join(PACKAGE_ROOT, "references", "reply-format-md.md");
const RUNTIME_CONFIG = join(PACKAGE_ROOT, "runtime.json");

async function readAllStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function readTextFile(path) {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

function readRuntimeConfig() {
  const parsed = parseJson(readTextFile(RUNTIME_CONFIG));
  return parsed && typeof parsed === "object" ? parsed : {};
}

function detectHostInterface() {
  try {
    return execFileSync("bash", [DETECT_SCRIPT], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function resolveTemplatePath(hostInterface) {
  if (hostInterface === "md") {
    return MD_TEMPLATE;
  }

  return CLI_TEMPLATE;
}

function buildHostContextLine(hostInterface, templatePath) {
  if (hostInterface === "md") {
    return `Detected host interface: md. Use the Markdown reply template at ${templatePath}.`;
  }

  if (hostInterface === "cli") {
    return `Detected host interface: cli. Use the terminal-hosted reply template at ${templatePath}.`;
  }

  return `Detected host interface: unknown. Default to the CLI reply template at ${templatePath} unless stronger host evidence appears later.`;
}

function findExistingFile(startDir, relativePath) {
  if (!startDir) {
    return "";
  }

  let current = resolve(startDir);
  const root = parse(current).root;

  while (true) {
    const candidate = join(current, relativePath);
    const content = readTextFile(candidate);
    if (content) {
      return candidate;
    }

    if (current === root) {
      return "";
    }

    current = dirname(current);
  }
}

function extractCandidateDirs(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const dirs = [
    payload.cwd,
    payload.project_path,
    payload.projectPath,
    payload.workspace_root,
    payload.workspaceRoot,
  ];

  return dirs.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim());
}

function resolveUserRulesPath(payload) {
  for (const dir of extractCandidateDirs(payload)) {
    const discovered = findExistingFile(dir, ".codex/memory/USER.md");
    if (discovered) {
      return discovered;
    }
  }

  const codexHome = process.env.CODEX_HOME || join(process.env.HOME || "", ".codex");
  const fallback = join(codexHome, "memory", "USER.md");
  if (readTextFile(fallback)) {
    return fallback;
  }

  return "";
}

function detectHookEventName(payload, existingOutput) {
  if (
    existingOutput &&
    typeof existingOutput === "object" &&
    existingOutput.hookSpecificOutput &&
    typeof existingOutput.hookSpecificOutput === "object" &&
    typeof existingOutput.hookSpecificOutput.hookEventName === "string" &&
    existingOutput.hookSpecificOutput.hookEventName.trim()
  ) {
    return existingOutput.hookSpecificOutput.hookEventName.trim();
  }

  if (payload && typeof payload === "object") {
    const candidates = [
      payload.hook_event_name,
      payload.hookEventName,
      payload.event,
      payload.name,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "SessionStart";
}

function resolveNativeHookPath() {
  if (typeof process.env.OMX_NATIVE_HOOK === "string" && process.env.OMX_NATIVE_HOOK.trim()) {
    return process.env.OMX_NATIVE_HOOK.trim();
  }

  const runtimeConfig = readRuntimeConfig();
  if (typeof runtimeConfig.omxNativeHook === "string" && runtimeConfig.omxNativeHook.trim()) {
    return runtimeConfig.omxNativeHook.trim();
  }

  const codexHome = process.env.CODEX_HOME || join(process.env.HOME || "", ".codex");
  const npmGlobalGuess = join(
    process.env.HOME || "",
    ".npm-global",
    "lib",
    "node_modules",
    "oh-my-codex",
    "dist",
    "scripts",
    "codex-native-hook.js",
  );
  const codexHomeGuess = join(codexHome, "vendor", "oh-my-codex", "dist", "scripts", "codex-native-hook.js");

  for (const candidate of [npmGlobalGuess, codexHomeGuess]) {
    if (readTextFile(candidate)) {
      return candidate;
    }
  }

  return "";
}

function runNativeHook(rawInput, nativeHookPath) {
  if (!nativeHookPath) {
    return { stdout: "", stderr: "", status: 0 };
  }

  const nativeResult = spawnSync("node", [nativeHookPath], {
    encoding: "utf8",
    input: rawInput,
  });

  return {
    stdout: nativeResult.stdout || "",
    stderr: nativeResult.stderr || "",
    status: typeof nativeResult.status === "number" ? nativeResult.status : 0,
  };
}

function buildSessionStartContext(hostInterface, payload) {
  const templatePath = resolveTemplatePath(hostInterface);
  const templateContent = readTextFile(templatePath);
  const userRulesPath = resolveUserRulesPath(payload);
  const rulesLine = userRulesPath
    ? `Reply-format rules are centrally defined in ${userRulesPath}. Keep that file as the single source of truth.`
    : "Reply-format rules are not available from a discovered USER.md file; apply the selected template directly for this session.";
  const sections = [
    buildHostContextLine(hostInterface, templatePath),
    rulesLine,
    "Apply these reply rules in every main-agent response:",
    "- Begin with Goal, Ambiguity, and Risk, and make them describe the current longrun rather than the latest local action.",
    "- Ambiguity and Risk must use percentages.",
    "- Explain the highest current longrun risk inline in the Risk description.",
    "- Use these thresholds for Ambiguity and Risk: green for under 10%, yellow for 10%-39%, red for 40% and above.",
    hostInterface === "md"
      ? "- In this session, render them with the Markdown table format."
      : "- In this session, use the CLI-style aligned format unless stronger host evidence appears later.",
  ];

  if (templateContent) {
    sections.push(`Selected reply template:\n\n${templateContent}`);
  }

  return sections.join("\n");
}

function buildPromptSubmitContext(hostInterface, payload) {
  const userRulesPath = resolveUserRulesPath(payload);
  if (userRulesPath) {
    return `Reply format remains governed by ${userRulesPath}.`;
  }
  return "Reply format remains governed by the selected template for this session.";
}

function buildAdditionalContext(hostInterface, hookEventName, payload) {
  if (hookEventName === "SessionStart") {
    return buildSessionStartContext(hostInterface, payload);
  }

  if (hookEventName === "UserPromptSubmit") {
    return buildPromptSubmitContext(hostInterface, payload);
  }

  return buildHostContextLine(hostInterface, resolveTemplatePath(hostInterface));
}

function mergeHookOutput(existingOutput, additionalContext, hookEventName) {
  const nextOutput = existingOutput && typeof existingOutput === "object" ? { ...existingOutput } : {};
  const currentHookSpecificOutput =
    nextOutput.hookSpecificOutput && typeof nextOutput.hookSpecificOutput === "object"
      ? { ...nextOutput.hookSpecificOutput }
      : { hookEventName };

  const existingContext =
    typeof currentHookSpecificOutput.additionalContext === "string"
      ? currentHookSpecificOutput.additionalContext.trim()
      : "";

  currentHookSpecificOutput.additionalContext = existingContext
    ? `${additionalContext}\n\n${existingContext}`
    : additionalContext;

  nextOutput.hookSpecificOutput = currentHookSpecificOutput;
  return nextOutput;
}

const rawInput = await readAllStdin();
const payload = parseJson(rawInput);
const nativeHookPath = resolveNativeHookPath();
const nativeResult = runNativeHook(rawInput, nativeHookPath);

if (nativeResult.stderr) {
  process.stderr.write(nativeResult.stderr);
}

if (typeof nativeResult.status === "number" && nativeResult.status !== 0) {
  process.exitCode = nativeResult.status;
  if (nativeResult.stdout) {
    process.stdout.write(nativeResult.stdout);
  }
  process.exit();
}

const hostInterface = detectHostInterface();
const existingOutput = parseJson(nativeResult.stdout || "");
const hookEventName = detectHookEventName(payload, existingOutput);
const additionalContext = buildAdditionalContext(hostInterface, hookEventName, payload);
const mergedOutput = mergeHookOutput(existingOutput, additionalContext, hookEventName);

process.stdout.write(`${JSON.stringify(mergedOutput)}\n`);
