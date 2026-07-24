import assert from 'node:assert/strict'
import test from 'node:test'

import { scanSensitiveContent } from '../scripts/validate-sensitive-content.ts'

test('scanSensitiveContent detects private key blocks', () => {
  const privateKeyHeader = ['-----BEGIN OPENSSH', 'PRIVATE KEY-----'].join(' ')
  const privateKeyFooter = ['-----END OPENSSH', 'PRIVATE KEY-----'].join(' ')
  const findings = scanSensitiveContent(
    'keys.txt',
    `notes
${privateKeyHeader}
abc
${privateKeyFooter}
`,
  )

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'private-key-block')
  assert.equal(findings[0].line, 2)
})

test('scanSensitiveContent detects jwt token assignments in staged text', () => {
  const token = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJzdWIiOiJ0ZXN0IiwibmFtZSI6InRlc3QifQ',
    'signaturevalue123',
  ].join('.')
  const findings = scanSensitiveContent(
    'config.yaml',
    `users:
  - name: terencefan
    user:
      token: ${token}
`,
  )

  assert.ok(findings.some((finding) => finding.rule === 'jwt-token'))
  assert.ok(findings.every((finding) => finding.line === 4))
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

test('scanSensitiveContent detects generic credential assignments', () => {
  const value = ['s3cr3t', 'value', 'with', 'entropy'].join('-')
  const findings = scanSensitiveContent(
    'config.env',
    `client_secret=${value}
`,
  )

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'credential-assignment')
})

test('scanSensitiveContent detects internal organization identifiers', () => {
  const organization = ['pj', 'lab'].join('')
  const findings = scanSensitiveContent('notes.md', `owner: ${organization}\n`)

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'organization-identifier')
})

test('scanSensitiveContent detects internal cluster and host identifiers', () => {
  const cluster = ['h', 'cluster'].join('-')
  const findings = scanSensitiveContent('notes.md', `target: ${cluster}\n`)

  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'internal-cluster-or-host')
})

test('scanSensitiveContent detects private domains and concrete IP addresses', () => {
  const domain = ['service', 'cluster', 'local'].join('.')
  const address = ['10', '20', '30', '40'].join('.')
  const findings = scanSensitiveContent(
    'config.yaml',
    `endpoint: https://${domain}\naddress: ${address}\n`,
  )

  assert.deepEqual(
    findings.map((finding) => finding.rule).sort(),
    ['internal-domain', 'ip-address'],
  )
})
