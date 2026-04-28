#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { buildMarkdownNodes } from '../src/markdownDocumentModel.js'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])
const ABSOLUTE_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/
const HTML_ID_RE = /<[^>]+\sid=["']([^"']+)["'][^>]*>/giu

function normalizeFragment(value) {
  if (!value) {
    return ''
  }
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}

function normalizePathPart(value) {
  if (!value) {
    return ''
  }
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}

function isMarkdownFile(filePath) {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function traverseNodes(nodes, visitor) {
  for (const node of nodes || []) {
    visitor(node)
    traverseNodes(node.children || [], visitor)
  }
}

export function collectDocumentAnchors(source) {
  const anchors = new Set()
  const { tocItems = [] } = buildMarkdownNodes(source)
  for (const item of tocItems) {
    if (item?.id) {
      anchors.add(item.id)
    }
  }
  for (const match of source.matchAll(HTML_ID_RE)) {
    if (match[1]) {
      anchors.add(match[1].trim())
    }
  }
  return anchors
}

function classifyHref(rawHref) {
  const href = rawHref.trim()
  if (!href) {
    return null
  }
  if (href.startsWith('#')) {
    return {
      kind: 'hash',
      fragment: normalizeFragment(href.slice(1)),
      rawHref: href,
    }
  }
  if (href.startsWith('/') || ABSOLUTE_SCHEME_RE.test(href)) {
    return null
  }

  const hashIndex = href.indexOf('#')
  const rawPath = hashIndex === -1 ? href : href.slice(0, hashIndex)
  const rawFragment = hashIndex === -1 ? '' : href.slice(hashIndex + 1)
  const normalizedPath = normalizePathPart(rawPath)
  const normalizedFragment = normalizeFragment(rawFragment)

  if (!normalizedPath) {
    return normalizedFragment
      ? {
          kind: 'hash',
          fragment: normalizedFragment,
          rawHref: href,
        }
      : null
  }

  if (!isMarkdownFile(normalizedPath)) {
    return null
  }

  return {
    kind: 'markdown',
    fragment: normalizedFragment,
    rawHref: href,
    targetPath: normalizedPath,
  }
}

export function collectInternalMarkdownLinks(source) {
  const links = []
  const { nodes = [] } = buildMarkdownNodes(source)

  traverseNodes(nodes, (node) => {
    const token = node?.token
    if (token?.type !== 'inline' || !Array.isArray(token.children)) {
      return
    }
    const line = Array.isArray(token.map) && token.map.length > 0 ? token.map[0] + 1 : null
    for (const child of token.children) {
      if (child?.type !== 'link_open' || typeof child.attrGet !== 'function') {
        continue
      }
      const href = child.attrGet('href')
      if (typeof href !== 'string') {
        continue
      }
      const classified = classifyHref(href)
      if (classified) {
        links.push({ ...classified, line })
      }
    }
  })

  return links
}

function resolveMarkdownTarget(sourceFile, relativeTarget) {
  const candidate = path.resolve(path.dirname(sourceFile), relativeTarget)
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const readmePath = path.join(candidate, 'README.md')
    if (fs.existsSync(readmePath)) {
      return readmePath
    }
  }
  return candidate
}

export function collectRepoMarkdownFiles(repoRoot) {
  const files = []

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue
      }
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(absolutePath)
        continue
      }
      if (entry.isFile() && isMarkdownFile(absolutePath)) {
        files.push(absolutePath)
      }
    }
  }

  walk(repoRoot)
  files.sort()
  return files
}

function findRepoRoot(startDir) {
  let current = path.resolve(startDir)
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) {
      return path.resolve(startDir)
    }
    current = parent
  }
}

export function validateMarkdownFiles(filePaths) {
  const errors = []
  const anchorCache = new Map()

  function getAnchors(filePath) {
    if (!anchorCache.has(filePath)) {
      const source = fs.readFileSync(filePath, 'utf8')
      anchorCache.set(filePath, collectDocumentAnchors(source))
    }
    return anchorCache.get(filePath)
  }

  for (const filePath of filePaths) {
    const source = fs.readFileSync(filePath, 'utf8')
    const links = collectInternalMarkdownLinks(source)
    for (const link of links) {
      if (link.kind === 'hash') {
        const anchors = getAnchors(filePath)
        if (!anchors.has(link.fragment)) {
          errors.push({
            filePath,
            href: link.rawHref,
            line: link.line,
            message: `missing anchor \`${link.fragment}\` in current file`,
          })
        }
        continue
      }

      const targetFile = resolveMarkdownTarget(filePath, link.targetPath)
      if (!fs.existsSync(targetFile)) {
        errors.push({
          filePath,
          href: link.rawHref,
          line: link.line,
          message: `missing target file \`${path.relative(path.dirname(filePath), targetFile) || path.basename(targetFile)}\``,
        })
        continue
      }
      if (link.fragment) {
        const anchors = getAnchors(targetFile)
        if (!anchors.has(link.fragment)) {
          errors.push({
            filePath,
            href: link.rawHref,
            line: link.line,
            message: `missing anchor \`${link.fragment}\` in \`${path.relative(path.dirname(filePath), targetFile)}\``,
          })
        }
      }
    }
  }

  return errors
}

function parseArgs(argv) {
  const args = { all: false, files: [], repoRoot: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--all') {
      args.all = true
      continue
    }
    if (arg === '--repo-root') {
      args.repoRoot = argv[index + 1] || ''
      index += 1
      continue
    }
    args.files.push(arg)
  }
  return args
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const args = parseArgs(argv)
  const repoRoot = args.repoRoot ? path.resolve(cwd, args.repoRoot) : findRepoRoot(cwd)

  let filesToValidate = []
  let scopeLabel = 'all'

  if (args.files.length > 0) {
    filesToValidate = args.files.map((item) => path.resolve(cwd, item))
    scopeLabel = 'explicit'
  } else {
    filesToValidate = collectRepoMarkdownFiles(repoRoot)
    scopeLabel = args.all ? 'all' : 'all'
  }

  if (filesToValidate.length === 0) {
    console.log('[markdown-link-validator] no markdown files to validate')
    return 0
  }

  const errors = validateMarkdownFiles(filesToValidate)
  if (errors.length === 0) {
    console.log(`[markdown-link-validator] PASS (${scopeLabel}) ${filesToValidate.length} file(s) checked`)
    return 0
  }

  console.error(`[markdown-link-validator] FAIL (${scopeLabel}) ${errors.length} issue(s)`)
  for (const error of errors) {
    const relativePath = path.relative(repoRoot, error.filePath) || path.basename(error.filePath)
    const lineLabel = error.line == null ? '' : `:${error.line}`
    console.error(`- ${relativePath}${lineLabel} -> ${error.href}`)
    console.error(`  ${error.message}`)
  }
  return 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main()
}
