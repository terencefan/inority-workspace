import { handleAddQa } from "./add_qa.mjs";
import { handleAddStep } from "./add_step.mjs";
import { handleInit } from "./init.mjs";
import { handleMoveStep } from "./move_step.mjs";
import { handleNormalize } from "./normalize.mjs";
import { handleRemoveStep } from "./remove_step.mjs";
import { handleShiftItems } from "./shift_items.mjs";
import { handleSignStep } from "./sign_step.mjs";
import { handleSyncRecords } from "./sync_records.mjs";
import { handleValidate } from "./validate.mjs";
import { handleValidatePlanningMode } from "./validate_planning_mode.mjs";

const COMMANDS = {
  init: { handler: handleInit, options: ["path", "--title", "--force"] },
  "add-step": { handler: handleAddStep, options: ["path", "--title", "--after"] },
  "add-qa": { handler: handleAddQa, options: ["path", "--question", "--answer", "--time", "--impact"] },
  "move-step": { handler: handleMoveStep, options: ["path", "--item", "--after"] },
  "remove-step": { handler: handleRemoveStep, options: ["path", "--item"] },
  normalize: { handler: handleNormalize, options: ["path"] },
  validate: { handler: handleValidate, options: ["path", "--json"] },
  "validate-planning-mode": { handler: handleValidatePlanningMode, options: ["path", "--mode", "--json"] },
  "shift-items": { handler: handleShiftItems, options: ["runbook", "--start", "--shift", "--in-place"] },
  "sign-step": { handler: handleSignStep, options: ["runbook", "--item", "--phase", "--signer", "--timestamp", "--dry-run"] },
  "sync-records": { handler: handleSyncRecords, options: ["path"] },
};

function helpText(prog = "runctl") {
  return `usage: ${prog} <command> [options]

runbook-ctl unified CLI for validating and editing authority runbooks.

commands:
  init
  add-step
  add-qa
  move-step
  remove-step
  normalize
  validate
  validate-planning-mode
  shift-items
  sign-step
  sync-records
`;
}

function parseFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  if (index === argv.length - 1) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function parseIntegerFlag(argv, flag) {
  const value = parseFlagValue(argv, flag);
  if (value == null) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${flag} must be an integer`);
  }
  return number;
}

function ensurePositional(argv, index, name) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing required argument: ${name}`);
  }
  return value;
}

function parseArgs(command, argv) {
  switch (command) {
    case "init":
      return { path: ensurePositional(argv, 0, "path"), title: parseFlagValue(argv, "--title"), force: hasFlag(argv, "--force") };
    case "add-step":
      return { path: ensurePositional(argv, 0, "path"), title: parseFlagValue(argv, "--title"), after: parseIntegerFlag(argv, "--after") };
    case "add-qa":
      return {
        path: ensurePositional(argv, 0, "path"),
        question: parseFlagValue(argv, "--question"),
        answer: parseFlagValue(argv, "--answer"),
        time: parseFlagValue(argv, "--time"),
        impact: parseFlagValue(argv, "--impact"),
      };
    case "move-step":
      return { path: ensurePositional(argv, 0, "path"), item: parseIntegerFlag(argv, "--item"), after: parseIntegerFlag(argv, "--after") };
    case "remove-step":
      return { path: ensurePositional(argv, 0, "path"), item: parseIntegerFlag(argv, "--item") };
    case "normalize":
    case "validate":
    case "sync-records":
      return { path: ensurePositional(argv, 0, "path"), json: hasFlag(argv, "--json") };
    case "validate-planning-mode":
      return { path: ensurePositional(argv, 0, "path"), mode: parseFlagValue(argv, "--mode"), json: hasFlag(argv, "--json") };
    case "shift-items":
      return {
        runbook: ensurePositional(argv, 0, "runbook"),
        start: parseIntegerFlag(argv, "--start"),
        shift: parseIntegerFlag(argv, "--shift"),
        inPlace: hasFlag(argv, "--in-place"),
      };
    case "sign-step":
      return {
        runbook: ensurePositional(argv, 0, "runbook"),
        item: parseIntegerFlag(argv, "--item"),
        phase: parseFlagValue(argv, "--phase"),
        signer: parseFlagValue(argv, "--signer") ?? "codex",
        timestamp: parseFlagValue(argv, "--timestamp"),
        dryRun: hasFlag(argv, "--dry-run"),
      };
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

function ensureRequired(command, args) {
  const requiredByCommand = {
    init: ["path"],
    "add-step": ["path", "title"],
    "add-qa": ["path", "question", "answer", "impact"],
    "move-step": ["path", "item", "after"],
    "remove-step": ["path", "item"],
    normalize: ["path"],
    validate: ["path"],
    "validate-planning-mode": ["path", "mode"],
    "shift-items": ["runbook", "start", "shift"],
    "sign-step": ["runbook", "item", "phase"],
    "sync-records": ["path"],
  };
  for (const key of requiredByCommand[command] ?? []) {
    if (args[key] == null) {
      throw new Error(`missing required option: ${key}`);
    }
  }
}

export async function main(argv = process.argv.slice(2), { prog = "runctl" } = {}) {
  if (argv.length === 0 || argv.includes("--help")) {
    process.stdout.write(helpText(prog));
    return 0;
  }
  const [command, ...rest] = argv;
  const entry = COMMANDS[command];
  if (!entry) {
    process.stderr.write(`error: unknown command: ${command}\n`);
    process.stdout.write(helpText(prog));
    return 2;
  }
  try {
    const args = parseArgs(command, rest);
    ensureRequired(command, args);
    return await entry.handler(args);
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    return 2;
  }
}
