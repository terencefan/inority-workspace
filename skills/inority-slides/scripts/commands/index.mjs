import { handleInit } from "./init.mjs";
import { handleValidate } from "./validate.mjs";

const COMMANDS = {
  init: { handler: handleInit },
  validate: { handler: handleValidate },
};

function helpText(prog = "slidesctl") {
  return `usage: ${prog} <command> [options]

slides planning CLI for standalone static slides projects.

commands:
  init
  validate
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
    case "validate":
      return { path: ensurePositional(argv, 0, "path"), json: hasFlag(argv, "--json") };
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

function ensureRequired(command, args) {
  const requiredByCommand = {
    init: ["path"],
    validate: ["path"],
  };
  for (const key of requiredByCommand[command] ?? []) {
    if (args[key] == null) {
      throw new Error(`missing required option: ${key}`);
    }
  }
}

export async function main(argv = process.argv.slice(2), { prog = "slidesctl" } = {}) {
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
