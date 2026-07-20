export function buildFileTree(paths) {
  const root = []

  paths.forEach((path) => {
    const segments = path.split('/').filter(Boolean)
    let level = root

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1
      let node = level.find((entry) => entry.name === segment)

      if (!node) {
        node = {
          name: segment,
          type: isFile ? 'file' : 'directory',
          path: isFile ? path : segments.slice(0, index + 1).join('/'),
          children: [],
        }
        level.push(node)
      }

      if (!isFile) {
        level = node.children
      }
    })
  })

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1
      }
      return left.name.localeCompare(right.name)
    })

    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortNodes(node.children)
      }
    })
  }

  sortNodes(root)
  return root
}

export function countDirectories(nodes) {
  return nodes.reduce((total, node) => {
    if (node.type !== 'directory') {
      return total
    }
    return total + 1 + countDirectories(node.children)
  }, 0)
}

export function collectDirectoryPaths(nodes, paths = new Set()) {
  nodes.forEach((node) => {
    if (node.type !== 'directory') {
      return
    }

    paths.add(node.path)
    collectDirectoryPaths(node.children, paths)
  })

  return paths
}

export function collectAncestorPaths(path) {
  if (!path) {
    return []
  }

  const segments = path.split('/').filter(Boolean)
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'))
}

export function buildDirectoryPathSetFromFiles(paths) {
  const directories = new Set()

  paths.forEach((filePath) => {
    const segments = filePath.split('/').filter(Boolean)
    if (segments.length < 2) {
      return
    }

    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'))
    }
  })

  return directories
}

export function reconcileExpandedItems(currentExpandedItems, files, selectionPath) {
  const directoryPathSet = buildDirectoryPathSetFromFiles(files)
  const nextExpandedItems = currentExpandedItems.filter(
    (itemId, index) => directoryPathSet.has(itemId) && currentExpandedItems.indexOf(itemId) === index,
  )

  collectAncestorPaths(selectionPath).forEach((path) => {
    if (!directoryPathSet.has(path) || nextExpandedItems.includes(path)) {
      return
    }
    nextExpandedItems.push(path)
  })

  return nextExpandedItems
}

export function searchDocuments(files, fileMeta, query, limit = 20) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return []
  }

  return files
    .map((path) => {
      const fileName = path.split('/').filter(Boolean).at(-1) || path
      const title = fileMeta[path]?.title || ''
      const normalizedFileName = fileName.toLocaleLowerCase()
      const normalizedTitle = title.toLocaleLowerCase()
      const fileNameIndex = normalizedFileName.indexOf(normalizedQuery)
      const titleIndex = normalizedTitle.indexOf(normalizedQuery)

      if (fileNameIndex === -1 && titleIndex === -1) {
        return null
      }

      const score =
        normalizedFileName === normalizedQuery || normalizedTitle === normalizedQuery
          ? 0
          : normalizedFileName.startsWith(normalizedQuery) || normalizedTitle.startsWith(normalizedQuery)
            ? 1
            : Math.min(fileNameIndex === -1 ? Infinity : fileNameIndex, titleIndex === -1 ? Infinity : titleIndex) + 2

      const modifiedAt = Date.parse(fileMeta[path]?.modified_at || '') || 0
      return { path, fileName, title, score, modifiedAt }
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.modifiedAt - left.modifiedAt ||
        left.score - right.score ||
        left.fileName.localeCompare(right.fileName) ||
        left.path.localeCompare(right.path),
    )
    .slice(0, limit)
}
