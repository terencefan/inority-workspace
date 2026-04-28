import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { collectDocumentAnchors, collectInternalMarkdownLinks, validateMarkdownFiles } from '../scripts/validate-markdown-links.ts'

test('collectDocumentAnchors includes heading slugs and html ids', () => {
  const anchors = collectDocumentAnchors(`# Title Here

## Second Section

<a id="custom-anchor"></a>
`)

  assert.equal(anchors.has('title-here'), true)
  assert.equal(anchors.has('second-section'), true)
  assert.equal(anchors.has('custom-anchor'), true)
})

test('collectInternalMarkdownLinks keeps hash and relative markdown links while ignoring absolute links', () => {
  const links = collectInternalMarkdownLinks(`- [same](#section-a)
- [other](./guide.md#next-step)
- [viewer](/docs/README.md)
- [site](https://example.com)
`)

  assert.deepEqual(
    links.map((item) => item.rawHref),
    ['#section-a', './guide.md#next-step'],
  )
})

test('validateMarkdownFiles catches missing local anchors and missing target files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handbook-links-'))
  const sourceFile = path.join(tempDir, 'README.md')
  const targetFile = path.join(tempDir, 'guide.md')

  fs.writeFileSync(
    sourceFile,
    `# Home

- [jump](#missing-anchor)
- [guide](./guide.md#target-anchor)
- [missing](./missing.md)
`,
    'utf8',
  )
  fs.writeFileSync(
    targetFile,
    `# Guide

## Target Anchor
`,
    'utf8',
  )

  const errors = validateMarkdownFiles([sourceFile])

  assert.equal(errors.length, 2)
  assert.equal(errors.some((item) => item.href === '#missing-anchor'), true)
  assert.equal(errors.some((item) => item.href === './missing.md'), true)
})

test('validateMarkdownFiles accepts reachable html-id anchors in sibling markdown', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handbook-links-'))
  const sourceFile = path.join(tempDir, 'README.md')
  const targetFile = path.join(tempDir, 'guide.md')

  fs.writeFileSync(sourceFile, `- [guide](./guide.md#custom-anchor)\n`, 'utf8')
  fs.writeFileSync(targetFile, `<a id="custom-anchor"></a>\n`, 'utf8')

  const errors = validateMarkdownFiles([sourceFile])

  assert.deepEqual(errors, [])
})
