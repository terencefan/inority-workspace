#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const PRIVATE_KEY_BLOCK_RE = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g
const CLIENT_KEY_DATA_RE = /^\s*client-key-data:\s*([A-Za-z0-9+/=]{40,})\s*$/gm
const TOKEN_ASSIGNMENT_RE =
  /^\s*(?:token|access_token|id_token|refresh_token|authorization)\s*[:=]\s*["']?(Bearer\s+)?([A-Za-z0-9._-]{20,})["']?\s*$/gim
const JWT_RE = /^eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/
const FILE_ALLOW_PRAGMA = 'handbook-sensitive-validator: allow'

function isLikelyBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  for (const byte of sample) {
    if (byte === 0) {
      return true
    }
  }
  return false
}

function computeLineNumber(source, matchIndex) {
  let line = 1
  for (let index = 0; index < matchIndex; index += 1) {
    if (source.charCodeAt(index) === 10) {
      line += 1
    }
  }
  return line
}

function looksLikePlaceholder(value) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.includes('example') ||
    normalized.includes('replace-me') ||
    normalized.includes('changeme') ||
    normalized.includes('your-') ||
    normalized.includes('<') ||
    normalized.includes('...') ||
    normalized.includes('dummy')
  )
}

export function scanSensitiveContent(filePath, source) {
  if (source.includes(FILE_ALLOW_PRAGMA)) {
    return []
  }

  const findings = []

  for (const match of source.matchAll(PRIVATE_KEY_BLOCK_RE)) {
    findings.push({
      filePath,
      line: computeLineNumber(source, match.index ?? 0),
      rule: 'private-key-block',
      message: 'contains a private key block',
    })
  }

  for (const match of source.matchAll(CLIENT_KEY_DATA_RE)) {
    const value = match[1]?.trim() || ''
    if (!looksLikePlaceholder(value)) {
      findings.push({
        filePath,
        line: computeLineNumber(source, match.index ?? 0),
        rule: 'client-key-data',
        message: 'contains client-key-data that looks like an embedded private key',
      })
    }
  }

  for (const match of source.matchAll(TOKEN_ASSIGNMENT_RE)) {
    const tokenValue = match[2]?.trim() || ''
    if (!JWT_RE.test(tokenValue) || looksLikePlaceholder(tokenValue)) {
      continue
    }
    findings.push({
      filePath,
      line: computeLineNumber(source, match.index ?? 0),
      rule: 'jwt-token',
      message: 'contains a JWT-like token assignment',
    })
  }

  return findings
}

function readFileContent(rootDir, filePath) {
  const buffer = fs.readFileSync(path.join(rootDir, filePath))
  if (isLikelyBinary(buffer)) {
    return null
  }
  return buffer.toString('utf8')
}

function parseArgs(argv) {
  const args = { files: [], repoRoot: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--repo-root') {
      args.repoRoot = argv[index + 1] || ''
      index += 1
      continue
    }
    args.files.push(arg)
  }
  return args
}

export function validateSensitiveContent(rootDir, filePaths) {
  const findings = []
  for (const filePath of filePaths) {
    const source = readFileContent(rootDir, filePath)
    if (source === null) {
      continue
    }
    findings.push(...scanSensitiveContent(filePath, source))
  }
  return findings
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const args = parseArgs(argv)
  const rootDir = args.repoRoot ? path.resolve(cwd, args.repoRoot) : cwd
  const findings = validateSensitiveContent(rootDir, args.files)

  if (findings.length === 0) {
    console.log(`[sensitive-content-validator] PASS (${args.files.length} staged file(s) checked)`)
    return 0
  }

  console.error(`[sensitive-content-validator] FAIL (${findings.length} issue(s))`)
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} [${finding.rule}] ${finding.message}`)
  }
  return 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main()
}
