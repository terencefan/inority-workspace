#!/usr/bin/env node

import fs from 'node:fs'
import { isIP } from 'node:net'
import path from 'node:path'
import process from 'node:process'

const PRIVATE_KEY_BLOCK_RE = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g
const CLIENT_KEY_DATA_RE = /^\s*client-key-data:\s*([A-Za-z0-9+/=]{40,})\s*$/gm
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const BEARER_RE = /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/gi
const URL_CREDENTIAL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/gi
const GITHUB_TOKEN_RE = /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g
const GITLAB_TOKEN_RE = /\bglpat-[A-Za-z0-9_-]{20,}\b/g
const CLOUD_ACCESS_KEY_RE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
const CREDENTIAL_ASSIGNMENT_RE =
  /^\s*(?:api[_-]?key|access[_-]?key(?:[_-]?id)?|secret[_-]?access[_-]?key|client[_-]?secret|private[_-]?key|password|passwd|credential|token|access_token|id_token|refresh_token|authorization)\s*[:=]\s*["']?([^"'#\s]{8,})["']?\s*[,;]?\s*$/gim
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const IPV6_CANDIDATE_RE = /[0-9A-Fa-f:]{3,}/g
const DOMAIN_RE =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63})\b/gi
const URL_HOST_RE =
  /\b[a-z][a-z0-9+.-]*:\/\/(?:[^@\s/]+@)?(\[[^\]]+\]|[^:/\s]+)(?::\d+)?/gi
const HOST_ASSIGNMENT_RE =
  /\b(?:host|hostname|server|endpoint)\s*[:=]\s*["']?([a-z0-9][a-z0-9.-]{1,252})/gi

const ORGANIZATION_TERMS = [
  ['浦江', '实验室'].join(''),
  ['人工智能', '实验室'].join(''),
  ['ai', 'lab'].join(''),
  ['pj', 'lab'].join(''),
]

const INTERNAL_HOST_LABELS = [
  ['h', 'dev'].join('-'),
  ['d', 'dev'].join('-'),
  ['pt', 'dev'].join('-'),
  ['h', 'cluster'].join('-'),
  ['d', 'cluster'].join('-'),
  ['pt', 'cluster'].join('-'),
]

const INTERNAL_CLUSTER_RE = new RegExp(
  `\\b(?:d|h|pt)[ _-]?${['clu', 'ster'].join('')}\\b`,
  'gi',
)
const INTERNAL_CLUSTER_CN_RE = new RegExp(
  `(?<![A-Za-z0-9])(?:d|h|pt)\\s*${['集', '群'].join('')}`,
  'gi',
)
const NUMBERED_INTERNAL_HOST_RE = new RegExp(
  `\\b${['de', 'v'].join('')}[0-9]+\\b`,
  'gi',
)

const PRIVATE_DOMAIN_SUFFIXES = [
  ['cluster', 'local'].join('.'),
  ['in', 'ternal'].join(''),
  ['lo', 'cal'].join(''),
  ['la', 'n'].join(''),
  ['co', 'rp'].join(''),
  ['in', 'tra'].join(''),
  ['pri', 'vate'].join(''),
]

const DOCUMENTATION_IPV4_PREFIXES = ['192.0.2.', '198.51.100.', '203.0.113.']
const DOCUMENTATION_IPV6_PREFIX = ['2001', 'db8'].join(':')
const SCAN_IGNORED_DIRECTORIES = new Set([
  '.git',
  '.venv',
  'build',
  'coverage',
  'dist',
  'node_modules',
])

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
    normalized.includes('dummy') ||
    normalized.includes('${') ||
    normalized.includes('process.env') ||
    normalized.includes('redacted')
    || normalized.includes('(')
    || normalized.includes(')')
  )
}

function isAsciiWordCharacter(value) {
  return value !== undefined && /[a-z0-9_]/i.test(value)
}

function findLiteralMatches(source, term) {
  const matches = []
  const normalizedSource = source.toLowerCase()
  const normalizedTerm = term.toLowerCase()
  let offset = 0
  while (offset < normalizedSource.length) {
    const index = normalizedSource.indexOf(normalizedTerm, offset)
    if (index < 0) {
      break
    }
    const isAsciiTerm = /^[a-z0-9_]+$/i.test(term)
    if (
      !isAsciiTerm ||
      (!isAsciiWordCharacter(source[index - 1]) &&
        !isAsciiWordCharacter(source[index + term.length]))
    ) {
      matches.push({ index })
    }
    offset = index + term.length
  }
  return matches
}

function addFinding(findings, seen, filePath, source, index, rule, message) {
  const line = computeLineNumber(source, index)
  const key = `${filePath}:${line}:${rule}`
  if (seen.has(key)) {
    return
  }
  seen.add(key)
  findings.push({ filePath, line, rule, message })
}

function isDocumentationIp(value) {
  if (isIP(value) === 4) {
    return (
      value === '0.0.0.0' ||
      value.startsWith('127.') ||
      DOCUMENTATION_IPV4_PREFIXES.some((prefix) => value.startsWith(prefix))
    )
  }
  if (isIP(value) === 6) {
    return value.toLowerCase().startsWith(DOCUMENTATION_IPV6_PREFIX)
  }
  return false
}

function normalizeHost(value) {
  return value.replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '').toLowerCase()
}

function isInternalDomain(value) {
  const domain = normalizeHost(value)
  return (
    ORGANIZATION_TERMS.some((term) => domain.includes(term.toLowerCase())) ||
    PRIVATE_DOMAIN_SUFFIXES.some(
      (suffix) => domain === suffix || domain.endsWith(`.${suffix}`),
    )
  )
}

function isInternalHostLabel(value) {
  const host = normalizeHost(value)
  return (
    host === ['local', 'host'].join('') ||
    INTERNAL_HOST_LABELS.includes(host) ||
    new RegExp(`^${['de', 'v'].join('')}[0-9]+$`, 'i').test(host)
  )
}

function scanCredentialContent(filePath, source, findings, seen) {
  const rules = [
    [PRIVATE_KEY_BLOCK_RE, 'private-key-block', 'contains a private key block'],
    [JWT_RE, 'jwt-token', 'contains a JWT-like token'],
    [BEARER_RE, 'authorization-token', 'contains an inline authorization token'],
    [URL_CREDENTIAL_RE, 'url-credential', 'contains credentials embedded in a URL'],
    [GITHUB_TOKEN_RE, 'github-token', 'contains a GitHub token-like value'],
    [GITLAB_TOKEN_RE, 'gitlab-token', 'contains a GitLab token-like value'],
    [CLOUD_ACCESS_KEY_RE, 'cloud-access-key', 'contains a cloud access key-like value'],
  ]

  for (const [pattern, rule, message] of rules) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      addFinding(findings, seen, filePath, source, match.index ?? 0, rule, message)
    }
  }

  CLIENT_KEY_DATA_RE.lastIndex = 0
  for (const match of source.matchAll(CLIENT_KEY_DATA_RE)) {
    const value = match[1]?.trim() || ''
    if (!looksLikePlaceholder(value)) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index ?? 0,
        'client-key-data',
        'contains embedded client key data',
      )
    }
  }

  CREDENTIAL_ASSIGNMENT_RE.lastIndex = 0
  for (const match of source.matchAll(CREDENTIAL_ASSIGNMENT_RE)) {
    const value = match[1]?.trim() || ''
    if (!looksLikePlaceholder(value)) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index ?? 0,
        'credential-assignment',
        'contains a non-placeholder credential assignment',
      )
    }
  }
}

function scanOrganizationAndNetworkContent(filePath, source, findings, seen) {
  for (const term of ORGANIZATION_TERMS) {
    for (const match of findLiteralMatches(source, term)) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index,
        'organization-identifier',
        'contains an internal organization identifier',
      )
    }
  }

  for (const pattern of [
    INTERNAL_CLUSTER_RE,
    INTERNAL_CLUSTER_CN_RE,
    NUMBERED_INTERNAL_HOST_RE,
  ]) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index ?? 0,
        'internal-cluster-or-host',
        'contains an internal cluster or host identifier',
      )
    }
  }

  for (const label of INTERNAL_HOST_LABELS) {
    for (const match of findLiteralMatches(source, label)) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index,
        'internal-cluster-or-host',
        'contains an internal cluster or host identifier',
      )
    }
  }

  const basename = path.basename(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const shouldScanIp =
    extension !== '.css' &&
    basename !== 'package.json' &&
    basename !== 'package-lock.json'

  if (shouldScanIp) {
    IPV4_RE.lastIndex = 0
    for (const match of source.matchAll(IPV4_RE)) {
      const value = match[0]
      const lineStart = source.lastIndexOf('\n', match.index ?? 0) + 1
      const lineEnd = source.indexOf('\n', match.index ?? 0)
      const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd)
      const looksLikeSoftwareVersion =
        /\b(?:chrome|firefox|safari|user-agent|version)\b/i.test(line)
      if (
        isIP(value) === 4 &&
        !isDocumentationIp(value) &&
        !looksLikeSoftwareVersion
      ) {
        addFinding(
          findings,
          seen,
          filePath,
          source,
          match.index ?? 0,
          'ip-address',
          'contains a non-documentation IP address',
        )
      }
    }

    IPV6_CANDIDATE_RE.lastIndex = 0
    for (const match of source.matchAll(IPV6_CANDIDATE_RE)) {
      const value = match[0]
      if (isIP(value) === 6 && !isDocumentationIp(value)) {
        addFinding(
          findings,
          seen,
          filePath,
          source,
          match.index ?? 0,
          'ip-address',
          'contains a non-documentation IP address',
        )
      }
    }
  }

  DOMAIN_RE.lastIndex = 0
  for (const match of source.matchAll(DOMAIN_RE)) {
    if (isInternalDomain(match[0])) {
      addFinding(
        findings,
        seen,
        filePath,
        source,
        match.index ?? 0,
        'internal-domain',
        'contains an internal or private domain name',
      )
    }
  }

  URL_HOST_RE.lastIndex = 0
  for (const match of source.matchAll(URL_HOST_RE)) {
    const host = normalizeHost(match[1] || '')
    if (isInternalHostLabel(host)) {
      const hostOffset = (match.index ?? 0) + match[0].indexOf(match[1])
      addFinding(
        findings,
        seen,
        filePath,
        source,
        hostOffset,
        'hostname',
        'contains an internal hostname',
      )
    }
  }

  HOST_ASSIGNMENT_RE.lastIndex = 0
  for (const match of source.matchAll(HOST_ASSIGNMENT_RE)) {
    const host = normalizeHost(match[1] || '')
    if (isInternalHostLabel(host) || isInternalDomain(host) || isIP(host) !== 0) {
      const hostOffset = (match.index ?? 0) + match[0].lastIndexOf(match[1])
      addFinding(
        findings,
        seen,
        filePath,
        source,
        hostOffset,
        'hostname',
        'contains a concrete internal hostname or address',
      )
    }
  }
}

export function scanSensitiveContent(filePath, source) {
  const findings = []
  const seen = new Set()
  scanCredentialContent(filePath, source, findings, seen)
  scanOrganizationAndNetworkContent(filePath, source, findings, seen)
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
  const args = { all: false, files: [], repoRoot: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--repo-root') {
      args.repoRoot = argv[index + 1] || ''
      index += 1
      continue
    }
    if (arg === '--all') {
      args.all = true
      continue
    }
    args.files.push(arg)
  }
  return args
}

function listRepositoryFiles(rootDir) {
  const filePaths = []
  const pending = ['']
  while (pending.length > 0) {
    const relativeDir = pending.pop()
    const absoluteDir = path.join(rootDir, relativeDir)
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isDirectory() && SCAN_IGNORED_DIRECTORIES.has(entry.name)) {
        continue
      }
      const relativePath = path.join(relativeDir, entry.name)
      if (entry.isDirectory()) {
        pending.push(relativePath)
      } else if (entry.isFile()) {
        filePaths.push(relativePath)
      }
    }
  }
  return filePaths.sort()
}

export function validateSensitiveContent(rootDir, filePaths) {
  const findings = []
  for (const filePath of filePaths) {
    const absolutePath = path.join(rootDir, filePath)
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue
    }
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
  const filePaths = args.all ? listRepositoryFiles(rootDir) : args.files
  const findings = validateSensitiveContent(rootDir, filePaths)

  if (findings.length === 0) {
    console.log(`[sensitive-content-validator] PASS (${filePaths.length} file(s) checked)`)
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
