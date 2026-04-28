import assert from 'node:assert/strict'
import test from 'node:test'

import { buildQuickAccessDocuments } from '../src/quickAccess.js'

test('quick access keeps the latest five valid files in order', () => {
  const quickAccessDocuments = buildQuickAccessDocuments(
    [
      { path: 'handbook/README.md', title: 'handbook' },
      { path: 'k8s/README.md', title: 'k8s' },
      { path: 'handbook/runbook/2026-04-27.md', title: 'runbook-1' },
      { path: 'handbook/runbook/2026-04-26.md', title: 'runbook-2' },
      { path: 'handbook/runbook/2026-04-25.md', title: 'runbook-3' },
      { path: 'handbook/runbook/2026-04-24.md', title: 'runbook-4' },
    ],
    {
      filePathSet: new Set([
        'handbook/README.md',
        'k8s/README.md',
        'handbook/runbook/2026-04-27.md',
        'handbook/runbook/2026-04-26.md',
        'handbook/runbook/2026-04-25.md',
        'handbook/runbook/2026-04-24.md',
      ]),
      limit: 5,
    },
  )

  assert.deepEqual(
    quickAccessDocuments.map((item) => item.path),
    [
      'handbook/README.md',
      'k8s/README.md',
      'handbook/runbook/2026-04-27.md',
      'handbook/runbook/2026-04-26.md',
      'handbook/runbook/2026-04-25.md',
    ],
  )
})

test('quick access skips missing and duplicate file entries', () => {
  const quickAccessDocuments = buildQuickAccessDocuments(
    [
      { path: 'handbook/README.md', title: 'handbook' },
      { path: 'handbook/README.md', title: 'duplicate' },
      { path: 'handbook/missing.md', title: 'missing' },
      { path: 'k8s/README.md', title: 'k8s' },
      null,
      { path: '', title: 'empty' },
    ],
    {
      filePathSet: new Set(['handbook/README.md', 'k8s/README.md']),
      limit: 5,
    },
  )

  assert.deepEqual(
    quickAccessDocuments.map((item) => item.path),
    ['handbook/README.md', 'k8s/README.md'],
  )
})
