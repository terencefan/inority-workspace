import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDirectoryPathSetFromFiles,
  buildFileTree,
  collectDirectoryPaths,
  reconcileExpandedItems,
  searchDocuments,
} from '../src/treeState.js'

test('buildFileTree keeps directories that only contain markdown in descendant folders', () => {
  const tree = buildFileTree([
    'handbook/README.md',
    'handbook/guides/setup/install.md',
    'handbook/guides/troubleshooting/faq.md',
  ])

  assert.deepEqual(
    tree.map((node) => ({ name: node.name, type: node.type })),
    [{ name: 'handbook', type: 'directory' }],
  )

  assert.deepEqual(Array.from(collectDirectoryPaths(tree)).sort(), [
    'handbook',
    'handbook/guides',
    'handbook/guides/setup',
    'handbook/guides/troubleshooting',
  ])
})

test('searchDocuments matches file names and markdown titles with useful ranking', () => {
  const files = [
    'docs/report/unipercept-idle-single-gpu-throughput.md',
    'docs/runbook/gpu.md',
    'docs/README.md',
  ]
  const fileMeta = {
    'docs/report/unipercept-idle-single-gpu-throughput.md': { title: 'UniPercept 单卡吞吐报告' },
    'docs/runbook/gpu.md': { title: 'GPU Runbook' },
    'docs/README.md': { title: 'Documentation' },
  }

  assert.deepEqual(searchDocuments(files, fileMeta, 'single-gpu').map((item) => item.path), [files[0]])
  assert.deepEqual(searchDocuments(files, fileMeta, '单卡吞吐').map((item) => item.path), [files[0]])
  assert.deepEqual(searchDocuments(files, fileMeta, 'gpu').map((item) => item.path), [files[1], files[0]])
  assert.deepEqual(searchDocuments(files, fileMeta, '  ').map((item) => item.path), [])
})

test('searchDocuments sorts matching files by modification time descending', () => {
  const files = ['docs/older-gpu.md', 'docs/newer-gpu.md', 'docs/no-date-gpu.md']
  const fileMeta = {
    [files[0]]: { title: 'GPU older', modified_at: '2026-07-16T08:00:00.000Z' },
    [files[1]]: { title: 'GPU newer', modified_at: '2026-07-17T08:00:00.000Z' },
    [files[2]]: { title: 'GPU undated' },
  }

  assert.deepEqual(searchDocuments(files, fileMeta, 'gpu').map((item) => item.path), [
    files[1],
    files[0],
    files[2],
  ])
})

test('reconcileExpandedItems preserves manual expansion while adding selected ancestors', () => {
  const files = [
    'project/README.md',
    'project/architecture/decisions/adr-001.md',
    'playbooks/bootstrap/checklist.md',
  ]

  const next = reconcileExpandedItems(['playbooks', 'playbooks/bootstrap'], files, 'project/README.md')

  assert.deepEqual(next, ['playbooks', 'playbooks/bootstrap', 'project'])
})

test('reconcileExpandedItems drops stale folders and expands deep markdown ancestor chain without README', () => {
  const files = ['docs/runbooks/2026-04-23/cluster-bootstrap.md']

  const next = reconcileExpandedItems(['obsolete', 'docs/removed'], files, 'docs/runbooks/2026-04-23/cluster-bootstrap.md')

  assert.deepEqual(next, ['docs', 'docs/runbooks', 'docs/runbooks/2026-04-23'])
  assert.deepEqual(Array.from(buildDirectoryPathSetFromFiles(files)), [
    'docs',
    'docs/runbooks',
    'docs/runbooks/2026-04-23',
  ])
})
