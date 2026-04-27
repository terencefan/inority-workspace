#!/usr/bin/env node
import { main } from "./commands/index.mjs";

process.stdout._handle?.setBlocking?.(true);
process.stderr._handle?.setBlocking?.(true);

const exitCode = await main(process.argv.slice(2), { prog: "runctl" });
await new Promise((resolve) => process.stdout.write("", resolve));
await new Promise((resolve) => process.stderr.write("", resolve));
process.exitCode = exitCode;
