#!/usr/bin/env node

import { main } from "./commands/index.mjs";

const code = await main(process.argv.slice(2), { prog: "slidesctl" });
process.exit(code);
