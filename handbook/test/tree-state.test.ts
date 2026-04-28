import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDirectoryPathSetFromFiles,
  buildFileTree,
  collectDirectoryPaths,
  reconcileExpandedItems,
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
