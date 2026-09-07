#!/usr/bin/env node

import { readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const documents = ['README.md', 'DEVELOP.md', 'AGENTS.md']

function options(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid argument near ${key || '<end>'}`)
    values.set(key, value)
  }
  return values
}

async function isFile(path) {
  return (await stat(path).catch(() => null))?.isFile() === true
}

async function init(target, name) {
  const conflicts = []
  for (const document of documents) if (await isFile(resolve(target, document))) conflicts.push(document)
  if (conflicts.length > 0) throw new Error(`refusing to overwrite existing files: ${conflicts.join(', ')}`)
  for (const document of documents) {
    const template = await readFile(resolve(skillRoot, 'assets/governance', `${document}.tmpl`), 'utf8')
    await writeFile(resolve(target, document), template.replaceAll('{{PROJECT_NAME}}', name), { encoding: 'utf8', flag: 'wx' })
  }
  process.stdout.write(`project scaffold created: ${target}\n`)
}

async function check(target) {
  const missing = []
  for (const document of documents) if (!await isFile(resolve(target, document))) missing.push(document)
  if (missing.length > 0) throw new Error(`missing project entry documents: ${missing.join(', ')}`)
  const readme = await readFile(resolve(target, 'README.md'), 'utf8')
  const develop = await readFile(resolve(target, 'DEVELOP.md'), 'utf8')
  const agents = await readFile(resolve(target, 'AGENTS.md'), 'utf8')
  if (!readme.includes('DEVELOP.md')) throw new Error('README.md must link to DEVELOP.md')
  if (!develop.includes('README.md') || !develop.includes('AGENTS.md')) throw new Error('DEVELOP.md must define README.md and AGENTS.md boundaries')
  if (!agents.includes('DEVELOP.md') || !agents.includes('README.md')) throw new Error('AGENTS.md must route human workflows and project navigation')
  process.stdout.write(`project scaffold ok: ${target}\n`)
}

async function main() {
  const [command, ...argv] = process.argv.slice(2)
  const values = options(argv)
  const target = resolve(values.get('--target') || '')
  if (!values.get('--target')) throw new Error('--target is required')
  if (command === 'init') {
    const name = values.get('--name')
    if (!name) throw new Error('--name is required for init')
    return init(target, name)
  }
  if (command === 'check') return check(target)
  throw new Error('usage: init-project.mjs <init|check> --target <repo> [--name <project-name>]')
}

main().catch((error) => {
  process.stderr.write(`project-scaffold: ${error.message}\n`)
  process.exitCode = 1
})
