import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMarkdownNodes } from '../src/markdownDocumentModel.js'
import { isRenderableSvgSource, looksLikeSvgMarkup } from '../src/markdownRenderUtils.js'

function collectNodeText(node) {
  const content = node.token.content || ''
  return content + (node.children || []).map((child) => collectNodeText(child)).join('')
}

function getTableRows(sectionNode) {
  return (sectionNode?.children || []).filter((child) => child.token.type === 'tr_open')
}

test('runbook external links table removes the link column and turns name into a link', () => {
  const source = `## 外部链接

| name | type | link | desc |
| --- | --- | --- | --- |
| network-topology-spec.md | authority source | [link](/tmp/network-topology-spec.md:274) | example desc |
`

  const { nodes } = buildMarkdownNodes(source)
  const tableNode = nodes.find((node) => node.token.type === 'table_open')

  assert.ok(tableNode)

  const headNode = tableNode.children.find((child) => child.token.type === 'thead_open')
  const bodyNode = tableNode.children.find((child) => child.token.type === 'tbody_open')
  const headerRow = getTableRows(headNode)[0]
  const bodyRow = getTableRows(bodyNode)[0]

  assert.deepEqual(
    headerRow.children.map((cell) => collectNodeText(cell).trim().toLowerCase()),
    ['name', 'type', 'desc'],
  )

  assert.equal(bodyRow.children.length, 3)

  const nameCell = bodyRow.children[0]
  const inlineNode = nameCell.children[0]
  const linkNode = inlineNode.token.children[0]

  assert.equal(inlineNode.token.type, 'inline')
  assert.equal(linkNode.type, 'link_open')
  assert.equal(linkNode.attrGet('href'), '/tmp/network-topology-spec.md:274')
  assert.equal(collectNodeText(nameCell).trim(), 'network-topology-spec.md')
})

test('non-external-links tables keep the original link column', () => {
  const source = `## 其他表

| name | type | link | desc |
| --- | --- | --- | --- |
| network-topology-spec.md | authority source | [link](/tmp/network-topology-spec.md:274) | example desc |
`

  const { nodes } = buildMarkdownNodes(source)
  const tableNode = nodes.find((node) => node.token.type === 'table_open')
  const headNode = tableNode.children.find((child) => child.token.type === 'thead_open')
  const headerRow = getTableRows(headNode)[0]

  assert.deepEqual(
    headerRow.children.map((cell) => collectNodeText(cell).trim().toLowerCase()),
    ['name', 'type', 'link', 'desc'],
  )
})

test('svg render utils detect fenced svg and html svg blocks', () => {
  const svgMarkup = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="80" />
</svg>`

  assert.equal(looksLikeSvgMarkup(svgMarkup), true)
  assert.equal(isRenderableSvgSource('svg', svgMarkup), true)
  assert.equal(isRenderableSvgSource('html', svgMarkup), true)
  assert.equal(isRenderableSvgSource('xml', svgMarkup), true)
  assert.equal(isRenderableSvgSource('bash', svgMarkup), false)
  assert.equal(looksLikeSvgMarkup('<div>not svg</div>'), false)
})
