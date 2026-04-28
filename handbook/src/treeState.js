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
