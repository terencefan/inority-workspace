export function buildQuickAccessDocuments(items, { filePathSet = null, limit = 5 } = {}) {
  if (!Array.isArray(items) || limit <= 0) {
    return Object.freeze([])
  }

  const seenPaths = new Set()
  const quickAccessItems = []

  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.path !== 'string' || !item.path) {
      continue
    }
    if (seenPaths.has(item.path)) {
      continue
    }
    if (filePathSet && !filePathSet.has(item.path)) {
      continue
    }

    seenPaths.add(item.path)
    quickAccessItems.push({ ...item })

    if (quickAccessItems.length >= limit) {
      break
    }
  }

  return Object.freeze(quickAccessItems)
}
