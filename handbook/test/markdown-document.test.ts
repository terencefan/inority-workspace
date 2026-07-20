import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMarkdownNodes } from '../src/markdownDocumentModel.js'
import { isRenderableSvgSource, looksLikeSvgMarkup, parseCitationMarkers } from '../src/markdownRenderUtils.js'

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

test('inline color span syntax emits constrained color tokens', () => {
  const { nodes } = buildMarkdownNodes('Status: [ok]{#abcdef} and [warn]{#FA0}.')
  const paragraph = nodes.find((node) => node.token.type === 'paragraph_open')
  const inline = paragraph?.children.find((node) => node.token.type === 'inline')
  const tokens = inline?.token.children || []

  assert.deepEqual(
    tokens.map((token) => token.type),
    ['text', 'span_open', 'text', 'span_close', 'text', 'span_open', 'text', 'span_close', 'text'],
  )
  assert.equal(tokens[1].attrGet('data-md-color'), '#abcdef')
  assert.equal(tokens[2].content, 'ok')
  assert.equal(tokens[5].attrGet('data-md-color'), '#fa0')
  assert.equal(tokens[6].content, 'warn')
})

test('table cells support inline color span syntax', () => {
  const source = `| Hex |
|---|
| [#abcdef]{#abcdef} |
`

  const { nodes } = buildMarkdownNodes(source)
  const tableNode = nodes.find((node) => node.token.type === 'table_open')
  const bodyNode = tableNode?.children.find((child) => child.token.type === 'tbody_open')
  const bodyRow = getTableRows(bodyNode)[0]
  const cell = bodyRow.children.find((child) => child.token.type === 'td_open')
  const inline = cell?.children.find((node) => node.token.type === 'inline')
  const tokens = inline?.token.children || []

  assert.deepEqual(tokens.map((token) => token.type), ['span_open', 'text', 'span_close'])
  assert.equal(tokens[0].attrGet('data-md-color'), '#abcdef')
  assert.equal(tokens[1].content, '#abcdef')
})

test('markdown formulas render through KaTeX for inline and display math', () => {
  const source = `Inline $R=N/T$ formula.

$$
R_j=\\frac{N_j}{T_j}
$$
`

  const { nodes } = buildMarkdownNodes(source)
  const paragraph = nodes.find((node) => node.token.type === 'paragraph_open')
  const inline = paragraph?.children.find((node) => node.token.type === 'inline')
  const inlineMath = inline?.token.children?.find((token) => token.type === 'html_inline')
  const blockMath = nodes.find((node) => node.token.type === 'html_block')

  assert.match(inlineMath?.content || '', /md-math-inline/u)
  assert.match(inlineMath?.content || '', /class="katex"/u)
  assert.match(blockMath?.token.content || '', /md-math-block/u)
  assert.match(blockMath?.token.content || '', /class="katex-display"/u)
  assert.match(blockMath?.token.content || '', /\\frac/u)
})

test('markdown formulas leave currency and inline code untouched', () => {
  const { nodes } = buildMarkdownNodes('Price is $5 and $10; code is `$R=N/T$`.')
  const paragraph = nodes.find((node) => node.token.type === 'paragraph_open')
  const inline = paragraph?.children.find((node) => node.token.type === 'inline')
  const tokens = inline?.token.children || []

  assert.equal(tokens.some((token) => token.type === 'html_inline'), false)
  assert.equal(tokens.some((token) => token.type === 'code_inline' && token.content === '$R=N/T$'), true)
})

test('katex and math fenced blocks render as display formulas while ordinary fences stay code', () => {
  const source = ['```katex', 'R_j=\\frac{N_j}{T_j}', '```', '', '```js', 'const value = 1', '```'].join('\n')
  const { nodes } = buildMarkdownNodes(source)
  const formula = nodes.find((node) => node.token.type === 'html_block')
  const code = nodes.find((node) => node.token.type === 'fence')

  assert.match(formula?.token.content || '', /md-math-block/u)
  assert.match(formula?.token.content || '', /class="katex-display"/u)
  assert.match(formula?.token.content || '', /\\frac/u)
  assert.equal(code?.token.info, 'js')
  assert.equal(code?.token.content, 'const value = 1\n')
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

test('citation marker parser extracts source references from text', () => {
  assert.deepEqual(parseCitationMarkers('1100W[@5] / 2700W[@12]'), [
    { type: 'text', value: '1100W' },
    { type: 'citation', value: '5' },
    { type: 'text', value: ' / 2700W' },
    { type: 'citation', value: '12' },
  ])

  assert.deepEqual(parseCitationMarkers('not a marker [@0] or [@x]'), [
    { type: 'text', value: 'not a marker [@0] or [@x]' },
  ])
})
