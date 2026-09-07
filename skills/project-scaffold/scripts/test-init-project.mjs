#!/usr/bin/env node

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const script = new URL('./init-project.mjs', import.meta.url)
const target = mkdtempSync(join(tmpdir(), 'project-scaffold-'))
execFileSync(process.execPath, [script.pathname, 'init', '--target', target, '--name', 'Example Project'])
for (const name of ['README.md', 'DEVELOP.md', 'AGENTS.md']) assert.match(readFileSync(join(target, name), 'utf8'), /Example Project/u)
execFileSync(process.execPath, [script.pathname, 'check', '--target', target])
assert.throws(() => execFileSync(process.execPath, [script.pathname, 'init', '--target', target, '--name', 'Other']), /refusing to overwrite/u)
writeFileSync(join(target, 'README.md'), '# Broken\n')
assert.throws(() => execFileSync(process.execPath, [script.pathname, 'check', '--target', target]), /must link to DEVELOP/u)
console.log('project-scaffold tests passed')
