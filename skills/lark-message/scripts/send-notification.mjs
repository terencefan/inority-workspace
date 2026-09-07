#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(SCRIPT_DIR, "..", "assets", "notifications");
const OPEN_ID = /^ou_[A-Za-z0-9]+$/;
const CHAT_ID = /^oc_[A-Za-z0-9]+$/;
const KEY = /^[a-z][a-z0-9_]*$/;

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function templateNames() {
  return readdirSync(TEMPLATE_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5))
    .sort();
}

function parseArgs(argv) {
  const result = { vars: {}, identity: "bot", send: false, selfTest: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--template") result.template = argv[++i];
    else if (arg === "--chat-id") result.chatId = argv[++i];
    else if (arg === "--user-id") result.userId = argv[++i];
    else if (arg === "--mention-open-id") result.mentionOpenId = argv[++i];
    else if (arg === "--idempotency-key") result.idempotencyKey = argv[++i];
    else if (arg === "--as") result.identity = argv[++i];
    else if (arg === "--var") {
      const entry = argv[++i] ?? "";
      const separator = entry.indexOf("=");
      if (separator < 1) throw new Error(`invalid --var ${entry}; expected key=value`);
      const key = entry.slice(0, separator);
      if (!KEY.test(key)) throw new Error(`invalid variable name: ${key}`);
      if (Object.hasOwn(result.vars, key)) throw new Error(`duplicate variable: ${key}`);
      result.vars[key] = entry.slice(separator + 1);
    } else if (arg === "--send") result.send = true;
    else if (arg === "--self-test") result.selfTest = true;
    else if (arg === "--list-templates") result.list = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return result;
}

function loadTemplate(name) {
  if (!templateNames().includes(name)) throw new Error(`unknown template: ${name}`);
  const parsed = JSON.parse(readFileSync(join(TEMPLATE_DIR, `${name}.json`), "utf8"));
  if (parsed?.template?.name !== name || !Array.isArray(parsed?.template?.required)) {
    throw new Error(`invalid template contract: ${name}`);
  }
  return parsed;
}

function renderValue(value, vars) {
  if (Array.isArray(value)) return value.map((item) => renderValue(item, vars));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, renderValue(child, vars)]));
  }
  if (typeof value !== "string") return value;
  return value.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, key) => {
    if (!Object.hasOwn(vars, key)) throw new Error(`template references missing variable: ${key}`);
    return vars[key];
  });
}

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit));
  if (!value || typeof value !== "object") return;
  visit(value);
  Object.values(value).forEach((child) => walk(child, visit));
}

export function renderTemplate(name, suppliedVars) {
  const source = loadTemplate(name);
  const vars = { ...suppliedVars };
  for (const key of source.template.required) {
    if (!Object.hasOwn(vars, key) || vars[key].trim() === "") throw new Error(`missing required variable: ${key}`);
  }
  if (!OPEN_ID.test(vars.mention_open_id ?? "")) throw new Error("invalid mention_open_id");
  const card = renderValue(source.card, vars);
  if (card.schema !== "2.0" || card.config?.width_mode !== "default") throw new Error("template must render Card 2.0 default width");
  const serialized = JSON.stringify(card);
  if (/\{\{[a-z][a-z0-9_]*\}\}/.test(serialized)) throw new Error("unresolved template variable");
  let mentionCount = 0;
  let visualBlocks = 0;
  walk(card.body, (node) => {
    if (node.tag === "markdown" && node.content.includes(`<at id=${vars.mention_open_id}></at>`)) mentionCount += 1;
  });
  visualBlocks = Array.isArray(card.body?.elements) ? card.body.elements.length : 0;
  if (mentionCount !== 1) throw new Error("template must mention the recipient exactly once");
  if (visualBlocks < 2 || visualBlocks > 5) throw new Error("template must contain 2 to 5 top-level visual blocks");
  return card;
}

function selfTest() {
  const fixtures = {
    "stage-complete": { project: "Edge", stage: "阶段 1", summary: "已完成。", validation: "探针通过。", next_stage: "阶段 2" },
    "status-update": { subject: "Edge 进度", status: "进行中", summary: "正在执行。", details: "现状已核对。", next_action: "继续验证" },
    "action-required": { subject: "Edge 审批", summary: "需要确认。", action: "请选择发布窗口。", deadline: "今天 18:00" }
  };
  for (const name of templateNames()) {
    const card = renderTemplate(name, { mention_open_id: "ou_123abc", ...fixtures[name] });
    if (JSON.stringify(card).includes("{{")) throw new Error(`${name}: unresolved placeholder`);
  }
  process.stdout.write(`notification templates self-test ok (${templateNames().join(", ")})\n`);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    if (options.list) return process.stdout.write(`${templateNames().join("\n")}\n`);
    if (options.selfTest) return selfTest();
    if (!options.template) throw new Error("--template is required");
    const hasChatId = CHAT_ID.test(options.chatId ?? "");
    const hasUserId = OPEN_ID.test(options.userId ?? "");
    if (hasChatId === hasUserId) throw new Error("exactly one valid --chat-id or --user-id is required");
    if (!OPEN_ID.test(options.mentionOpenId ?? "")) throw new Error("valid --mention-open-id is required");
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(options.idempotencyKey ?? "")) throw new Error("valid --idempotency-key is required (1-50 chars)");
    if (options.identity !== "bot") throw new Error("notification templates currently require --as bot");
    const card = renderTemplate(options.template, { ...options.vars, mention_open_id: options.mentionOpenId });
    const args = [
      "im", "+messages-send", "--as", options.identity,
      ...(hasChatId ? ["--chat-id", options.chatId] : ["--user-id", options.userId]),
      "--msg-type", "interactive", "--content", JSON.stringify(card),
      "--idempotency-key", options.idempotencyKey, "--json"
    ];
    if (!options.send) args.push("--dry-run");
    const result = spawnSync("lark-cli", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
  } catch (error) {
    die(error.message);
  }
}

main();
