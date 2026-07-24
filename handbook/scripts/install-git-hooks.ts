#!/usr/bin/env node

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'

const scriptRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptRoot, '..', '..')
const hooksDir = path.join(repoRoot, '.githooks')

function main() {
  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    console.log('[handbook-hooks] skip: not a git working tree')
    return 0
  }

  for (const entry of fs.readdirSync(hooksDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue
    }
    const hookPath = path.join(hooksDir, entry.name)
    fs.chmodSync(hookPath, 0o755)
  }

  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: repoRoot,
    stdio: 'ignore',
  })

  console.log('[inority-hooks] configured core.hooksPath=.githooks')
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main()
}
