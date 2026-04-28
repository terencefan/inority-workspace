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
