import MarkdownIt from 'markdown-it'

const markdownParser = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
})

applyTaskListPlugin(markdownParser)

function applyTaskListPlugin(renderer) {
  renderer.core.ruler.after('inline', 'task_list_items', (state) => {
    const { tokens } = state

    for (let index = 2; index < tokens.length; index += 1) {
      const inlineToken = tokens[index]
      const paragraphOpenToken = tokens[index - 1]
      const listItemOpenToken = tokens[index - 2]

      if (
        inlineToken.type !== 'inline' ||
        paragraphOpenToken.type !== 'paragraph_open' ||
        listItemOpenToken.type !== 'list_item_open'
      ) {
        continue
      }

      const children = inlineToken.children || []
      const firstTextToken = children.find((child) => child.type === 'text')

      if (!firstTextToken?.content) {
        continue
      }

      const match = firstTextToken.content.match(/^\[([ xX])\]\s+/u)

      if (!match) {
        continue
      }

      const isChecked = match[1].toLowerCase() === 'x'
      firstTextToken.content = firstTextToken.content.slice(match[0].length)

      if (!firstTextToken.content && children[0] === firstTextToken && children.length > 1) {
        inlineToken.children = children.filter((child, childIndex) => childIndex !== 0)
      }

      listItemOpenToken.meta = {
        ...(listItemOpenToken.meta || {}),
        taskListItem: {
          checked: isChecked,
        },
      }
      listItemOpenToken.attrJoin('class', 'task-list-item')

      const listOpenIndex = index - 3
      if (listOpenIndex >= 0) {
        const listOpenToken = tokens[listOpenIndex]
        if (listOpenToken?.type === 'bullet_list_open') {
          listOpenToken.attrJoin('class', 'contains-task-list')
        }
      }
    }
  })
}

export function buildTokenTree(tokens) {
  const root = { children: [] }
  const stack = [root]

  tokens.forEach((token) => {
    if (token.nesting === 1) {
      const node = { token, children: [] }
      stack.at(-1).children.push(node)
      stack.push(node)
      return
    }

    if (token.nesting === -1) {
      if (stack.length > 1) {
        stack.pop()
      }
      return
    }

    stack.at(-1).children.push({ token, children: [] })
  })

  return root.children
}

function extractInlineText(token) {
  if (!token) {
    return ''
  }

  if (!token.children || token.children.length === 0) {
    return token.content || ''
  }

  return token.children.map((child) => child.content || '').join('').trim()
}

function createSlugger() {
  const counts = new Map()

  return (value) => {
    const base =
      value
        .trim()
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section'
    const count = counts.get(base) || 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

function collectHeadingMetadata(tokens) {
  const tocItems = []
  const slugger = createSlugger()

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') {
      return
    }

    const inlineToken = tokens[index + 1]
    const title = extractInlineText(inlineToken)
    const level = Number(token.tag.replace('h', ''))
    const id = slugger(title || `section-${index}`)

    token.meta = {
      ...(token.meta || {}),
      headingId: id,
    }

    if (level >= 1 && level <= 4) {
      tocItems.push({ id, level, text: title || `Section ${index}` })
    }
  })

  return tocItems
}

function collectNodeText(node) {
  if (!node) {
    return ''
  }

  const content = node.token.content || ''
  if (!node.children || node.children.length === 0) {
    return content
  }

  return content + node.children.map((child) => collectNodeText(child)).join('')
}

function getTableSectionRows(sectionNode) {
  return sectionNode?.children?.filter((child) => child.token.type === 'tr_open') || []
}

function getInlineNode(node) {
  return node?.children?.find((child) => child.token.type === 'inline') || null
}

function getInlineLinkTokens(inlineNode) {
  const inlineChildren = inlineNode?.token.children || []
  const linkOpenIndex = inlineChildren.findIndex((token) => token.type === 'link_open')

  if (linkOpenIndex === -1) {
    return null
  }

  const linkCloseIndex = inlineChildren.findIndex(
    (token, index) => index > linkOpenIndex && token.type === 'link_close',
  )

  if (linkCloseIndex === -1) {
    return null
  }

  return {
    closeToken: inlineChildren[linkCloseIndex],
    openToken: inlineChildren[linkOpenIndex],
  }
}

function transformExternalLinksTable(tableNode) {
  const headNode = tableNode.children.find((child) => child.token.type === 'thead_open')
  const bodyNode = tableNode.children.find((child) => child.token.type === 'tbody_open')
  const headerRow = getTableSectionRows(headNode)[0]

  if (!headerRow || !bodyNode) {
    return
  }

  const headerLabels = headerRow.children
    .filter((child) => child.token.type === 'th_open')
    .map((child) => collectNodeText(child).trim().toLowerCase())

  if (headerLabels.join('|') !== 'name|type|link|desc') {
    return
  }

  headerRow.children.splice(2, 1)

  for (const rowNode of getTableSectionRows(bodyNode)) {
    const cells = rowNode.children.filter((child) => child.token.type === 'td_open')
    if (cells.length !== 4) {
      continue
    }

    const nameCell = cells[0]
    const linkCell = cells[2]
    const nameInline = getInlineNode(nameCell)
    const linkInline = getInlineNode(linkCell)
    const linkTokens = getInlineLinkTokens(linkInline)

    if (nameInline && linkTokens) {
      const nameLabel = collectNodeText(nameCell).trim()
      nameInline.token.children = [
        linkTokens.openToken,
        {
          attrs: null,
          block: false,
          children: null,
          content: nameLabel,
          hidden: false,
          info: '',
          level: 0,
          map: null,
          markup: '',
          meta: null,
          nesting: 0,
          tag: '',
          type: 'text',
        },
        linkTokens.closeToken,
      ]
    }

    rowNode.children.splice(2, 1)
  }
}

function transformRunbookExternalLinksTables(nodes) {
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const currentNode = nodes[index]
    const nextNode = nodes[index + 1]

    if (currentNode.token.type !== 'heading_open' || nextNode.token.type !== 'table_open') {
      continue
    }

    if (collectNodeText(currentNode).trim() !== '外部链接') {
      continue
    }

    transformExternalLinksTable(nextNode)
  }
}

function extractCitationTitleMap(source) {
  const lines = (source || '').split('\n')
  const titleMap = new Map()
  let inSourcesSection = false

  for (const line of lines) {
    if (/^\s*##\s+资料来源\s*$/u.test(line)) {
      inSourcesSection = true
      continue
    }

    if (inSourcesSection && /^\s*##\s+/u.test(line)) {
      break
    }

    if (!inSourcesSection) {
      continue
    }

    const match = line.match(/^\s*(\d+)\.\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/u)
    if (!match) {
      continue
    }

    titleMap.set(match[1], match[2].trim())
  }

  return titleMap
}

function setTokenAttribute(token, name, value) {
  if (typeof token?.attrSet === 'function') {
    token.attrSet(name, value)
    return
  }

  const attrs = token?.attrs || []
  const existingIndex = attrs.findIndex(([attrName]) => attrName === name)

  if (existingIndex >= 0) {
    attrs[existingIndex] = [name, value]
  } else {
    attrs.push([name, value])
  }

  token.attrs = attrs
}

function annotateCitationLinkTitles(tokens, citationTitleMap) {
  if (!(citationTitleMap instanceof Map) || citationTitleMap.size === 0) {
    return
  }

  for (const token of tokens) {
    if (token.type !== 'inline' || !Array.isArray(token.children)) {
      continue
    }

    const inlineChildren = token.children

    for (let index = 0; index < inlineChildren.length; index += 1) {
      const currentToken = inlineChildren[index]
      if (currentToken.type !== 'link_open') {
        continue
      }

      const nextTextToken = inlineChildren[index + 1]
      if (!nextTextToken || nextTextToken.type !== 'text') {
        continue
      }

      const match = nextTextToken.content.match(/^\[?@(\d+)\]?$/u)
      if (!match) {
        continue
      }

      const citationTitle = citationTitleMap.get(match[1])
      if (!citationTitle) {
        continue
      }

      setTokenAttribute(currentToken, 'title', citationTitle)
    }
  }
}

export function buildMarkdownNodes(source) {
  const tokens = markdownParser.parse(source || '', {})
  const citationTitleMap = extractCitationTitleMap(source)
  annotateCitationLinkTitles(tokens, citationTitleMap)
  const tocItems = collectHeadingMetadata(tokens)
  const nodes = buildTokenTree(tokens)
  transformRunbookExternalLinksTables(nodes)
  return { nodes, tocItems }
}
