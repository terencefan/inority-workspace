export function looksLikeSvgMarkup(source) {
  if (typeof source !== 'string') {
    return false
  }

  return /^\s*<svg[\s>][\s\S]*<\/svg>\s*$/iu.test(source)
}

export function isRenderableSvgSource(language, source) {
  const normalizedLanguage = (language || '').trim().toLowerCase()

  if (normalizedLanguage === 'svg') {
    return looksLikeSvgMarkup(source)
  }

  if (normalizedLanguage === 'html' || normalizedLanguage === 'xml') {
    return looksLikeSvgMarkup(source)
  }

  return false
}

export function parseCitationMarkers(source) {
  if (typeof source !== 'string' || source.length === 0) {
    return []
  }

  const parts = []
  const markerPattern = /\[@([1-9]\d*)\]/gu
  let lastIndex = 0
  let match

  while ((match = markerPattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: source.slice(lastIndex, match.index) })
    }

    parts.push({ type: 'citation', value: match[1] })
    lastIndex = markerPattern.lastIndex
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', value: source.slice(lastIndex) })
  }

  return parts
}
