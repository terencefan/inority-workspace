import assert from 'node:assert/strict'
import test from 'node:test'

import { scanSensitiveContent } from '../scripts/validate-sensitive-content.ts'

// handbook-sensitive-validator: allow

test('scanSensitiveContent detects private key blocks', () => {
  const findings = scanSensitiveContent(
    'keys.txt',
    `notes
-----BEGIN OPENSSH PRIVATE KEY-----
abc
-----END OPENSSH PRIVATE KEY-----
`,
  )

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'private-key-block')
  assert.equal(findings[0].line, 2)
})

test('scanSensitiveContent detects jwt token assignments in staged text', () => {
  const findings = scanSensitiveContent(
    'config.yaml',
    `users:
  - name: terencefan
    user:
      token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwibmFtZSI6InRlcmVuY2VmYW4ifQ.signaturevalue123
`,
  )

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'jwt-token')
  assert.equal(findings[0].line, 4)
})

test('scanSensitiveContent ignores placeholder examples', () => {
  const findings = scanSensitiveContent(
    'README.md',
    `token: <your-jwt-token>
client-key-data: EXAMPLE_EXAMPLE_EXAMPLE_EXAMPLE_EXAMPLE
`,
  )

  assert.deepEqual(findings, [])
})

test('scanSensitiveContent allows explicit file pragma escapes', () => {
  const findings = scanSensitiveContent(
    'fixture.ts',
    `// handbook-sensitive-validator: allow
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwibmFtZSI6InRlcmVuY2VmYW4ifQ.signaturevalue123
`,
  )

  assert.deepEqual(findings, [])
})
