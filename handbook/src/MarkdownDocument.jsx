/* eslint-disable react-refresh/only-export-components */
import { Fragment, useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import diff from 'highlight.js/lib/languages/diff'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import mermaid from 'mermaid'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import svgPanZoom from 'svg-pan-zoom'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import {
  Box,
  Checkbox,
  Divider,
  Dialog,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { alpha } from '@mui/material/styles'
import { buildMarkdownNodes, buildTokenTree } from './markdownDocumentModel.js'
import { isRenderableSvgSource, looksLikeSvgMarkup } from './markdownRenderUtils.js'

const GRAPHVIZ_LANGUAGES = new Set(['dot', 'graphviz'])
const HIGHLIGHT_LANGUAGE_ALIASES = new Map([
  ['js', 'javascript'],
  ['jsx', 'javascript'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['zsh', 'bash'],
  ['yml', 'yaml'],
  ['html', 'xml'],
  ['md', 'plaintext'],
  ['text', 'plaintext'],
  ['txt', 'plaintext'],
])
const BLOCKQUOTE_ALERT_TYPES = new Map([
  ['note', 'Note'],
  ['tip', 'Tip'],
  ['important', 'Important'],
  ['warning', 'Warning'],
  ['caution', 'Caution'],
])
const BLOCKQUOTE_ALERT_PATTERN = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/u
const HEADING_VARIANTS = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('python', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)

function getMarkdownTokens(theme) {
  return theme.handbookMarkdown || {}
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
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

function getTokenAttributes(token) {
  return Object.fromEntries(token.attrs || [])
}

function getHighlightMarkup(code, language) {
  const normalizedLanguage = (language || '').trim().toLowerCase()
  const trimmedCode = code.trimEnd()
  const escapedCode = escapeHtml(trimmedCode)
  const resolvedLanguage = HIGHLIGHT_LANGUAGE_ALIASES.get(normalizedLanguage) || normalizedLanguage
  let highlightedCode = escapedCode
  const codeClasses = ['hljs']

  if (resolvedLanguage && hljs.getLanguage(resolvedLanguage)) {
    highlightedCode = hljs.highlight(trimmedCode, { language: resolvedLanguage }).value
    codeClasses.push(`language-${escapeHtml(resolvedLanguage)}`)
  } else if (trimmedCode) {
    highlightedCode = hljs.highlightAuto(trimmedCode).value
  }

  if (normalizedLanguage) {
    codeClasses.push(`language-${escapeHtml(normalizedLanguage)}`)
  }

  return {
    className: codeClasses.join(' '),
    markup: highlightedCode,
  }
}

function getCellAlign(token) {
  const style = token.attrGet('style') || ''
  const match = style.match(/text-align:\s*(left|center|right)/i)
  return match?.[1]?.toLowerCase()
}

function stripBlockquoteAlert(inlineChildren) {
  let matchedVariant = null
  let strippedChildren = null

  for (let index = 0; index < inlineChildren.length; index += 1) {
    const child = inlineChildren[index]

    if (child.type !== 'text') {
      if (child.type === 'softbreak' || child.type === 'hardbreak') {
        continue
      }
      return null
    }

    const nextContent = child.content.replace(BLOCKQUOTE_ALERT_PATTERN, (_, variant) => {
      matchedVariant = variant.toLowerCase()
      return ''
    })

    if (!matchedVariant) {
      if (child.content.trim().length === 0) {
        continue
      }
      return null
    }

    strippedChildren = [
      ...inlineChildren.slice(0, index),
      ...(nextContent.length > 0 ? [{ ...child, content: nextContent }] : []),
      ...inlineChildren.slice(index + 1),
    ]
    break
  }

  if (!matchedVariant || !strippedChildren) {
    return null
  }

  return {
    variant: matchedVariant,
    inlineChildren: strippedChildren,
  }
}

function hasRenderableInlineContent(inlineChildren) {
  return extractInlineText({ children: inlineChildren }).length > 0
}

function getBlockquoteAlert(children) {
  const firstParagraphNode = children[0]

  if (firstParagraphNode?.token.type !== 'paragraph_open') {
    return null
  }

  const inlineIndex = firstParagraphNode.children.findIndex((child) => child.token.type === 'inline')
  if (inlineIndex === -1) {
    return null
  }

  const inlineNode = firstParagraphNode.children[inlineIndex]
  const strippedAlert = stripBlockquoteAlert(inlineNode.token.children || [])
  if (!strippedAlert) {
    return null
  }

  const updatedInlineNode = {
    ...inlineNode,
    token: {
      ...inlineNode.token,
      children: strippedAlert.inlineChildren,
      content: strippedAlert.inlineChildren.map((child) => child.content || '').join(''),
    },
  }
  const updatedParagraphChildren = firstParagraphNode.children.map((child, index) =>
    index === inlineIndex ? updatedInlineNode : child
  )
  const remainingChildren = hasRenderableInlineContent(strippedAlert.inlineChildren)
    ? [{ ...firstParagraphNode, children: updatedParagraphChildren }, ...children.slice(1)]
    : children.slice(1)

  return {
    variant: strippedAlert.variant,
    label: BLOCKQUOTE_ALERT_TYPES.get(strippedAlert.variant) || 'Note',
    children: remainingChildren,
  }
}

function isExternalHref(href) {
  return /^https?:\/\//iu.test(href)
}

function renderNodeChildren(children, keyPrefix) {
  return children.map((child, index) => renderMarkdownNode(child, `${keyPrefix}-${index}`))
}

function renderInlineChildren(tokens, keyPrefix) {
  return buildTokenTree(tokens).map((node, index) => renderMarkdownNode(node, `${keyPrefix}-${index}`))
}

function MermaidBlock({ source }) {
  const ref = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      const node = ref.current
      if (!node) {
        return
      }

      node.removeAttribute('data-processed')
      node.textContent = source

      try {
        await mermaid.run({ nodes: [node] })
      } catch (error) {
        if (cancelled || !ref.current) {
          return
        }

        ref.current.innerHTML = ''
        const pre = document.createElement('pre')
        pre.className = 'graphviz-error'
        pre.textContent = `Mermaid render failed:\n${error instanceof Error ? error.message : String(error)}`
        ref.current.appendChild(pre)
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [source])

  return (
    <Box ref={ref} className="mermaid" sx={{ my: 3, overflowX: 'auto' }}>
      {source}
    </Box>
  )
}

function SvgLightboxDialog({ open, onClose, svgMarkup, title }) {
  const previewViewportRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const viewerRef = useRef(null)
  const [zoom, setZoom] = useState(1)

  function resetPreviewZoom() {
    const viewer = viewerRef.current
    if (!viewer) {
      return
    }

    viewer.resetZoom()
    viewer.fit()
    viewer.center()
    setZoom(viewer.getZoom())
  }

  useEffect(() => {
    if (!open || !svgMarkup) {
      return
    }
    let cancelled = false
    let animationFrameId = 0
    let viewer = null
    let viewport = null

    function handleWheel(event) {
      if (!viewer) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = viewport.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15

      viewer.zoomAtPointBy(factor, point)
      setZoom(viewer.getZoom())
    }

    function initViewer() {
      if (cancelled) {
        return
      }

      viewport = previewViewportRef.current
      const canvas = previewCanvasRef.current
      if (!viewport || !canvas) {
        animationFrameId = requestAnimationFrame(initViewer)
        return
      }

      if (!canvas.querySelector('svg')) {
        canvas.innerHTML = svgMarkup
      }

      const svg = canvas.querySelector('svg')
      if (!svg) {
        animationFrameId = requestAnimationFrame(initViewer)
        return
      }

      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.display = 'block'
      svg.style.background = 'transparent'

      viewer = svgPanZoom(svg, {
        center: true,
        contain: false,
        controlIconsEnabled: false,
        dblClickZoomEnabled: false,
        fit: true,
        maxZoom: 10,
        minZoom: 0.5,
        mouseWheelZoomEnabled: false,
        panEnabled: true,
        preventMouseEventsDefault: true,
        zoomEnabled: true,
        zoomScaleSensitivity: 0.2,
        onZoom: (nextZoom) => {
          setZoom(nextZoom)
        },
      })
      viewerRef.current = viewer

      viewport.addEventListener('wheel', handleWheel, wheelOptions)

      requestAnimationFrame(() => {
        if (!viewer || cancelled) {
          return
        }

        viewer.resize()
        viewer.fit()
        viewer.center()
        setZoom(viewer.getZoom())
      })
    }

    const wheelOptions = { passive: false, capture: true }
    animationFrameId = requestAnimationFrame(initViewer)

    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrameId)
      viewport?.removeEventListener('wheel', handleWheel, wheelOptions)
      viewer?.destroy()
      viewerRef.current = null
    }
  }, [open, svgMarkup])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: 'min(96vw, 1600px)',
          maxWidth: 'none',
          height: 'min(92vh, 1200px)',
          bgcolor: '#0b1220',
          borderRadius: 0,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.65)',
          backgroundImage: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(8, 15, 28, 0.98))',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: '#dbeafe', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#93c5fd', letterSpacing: '0.04em' }}>
            {Math.round(zoom * 100)}%
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={resetPreviewZoom}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 36,
              appearance: 'none',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#dbeafe',
              cursor: 'pointer',
              px: 1.25,
              py: 0,
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(125, 211, 252, 0.7)',
                backgroundColor: 'rgba(14, 116, 144, 0.18)',
              },
            }}
          >
            重置
          </Box>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(125, 211, 252, 0.7)',
                backgroundColor: 'rgba(14, 116, 144, 0.18)',
              },
            }}
            aria-label={`关闭${title}`}
          >
            <CloseRoundedIcon fontSize="small" />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          p: 0,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            backgroundColor: 'rgba(2, 6, 23, 0.72)',
            boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.45)',
          }}
          ref={previewViewportRef}
          className="graphviz-lightbox"
        >
          <Box ref={previewCanvasRef} className="graphviz-lightbox-canvas" />
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              bottom: 14,
              px: 1.1,
              py: 0.45,
              backgroundColor: 'rgba(8, 15, 28, 0.82)',
              border: '1px solid rgba(125, 211, 252, 0.24)',
              color: '#cbd5e1',
              fontSize: '0.74rem',
              letterSpacing: '0.03em',
              pointerEvents: 'none',
            }}
          >
            左键拖拽平移，滚轮缩放
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}

function ZoomableSvgBlock({ svgMarkup, title, wrapperClassName, canvasClassName, errorMessage, isLoading }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  function closePreview() {
    setPreviewOpen(false)
  }

  function openPreview() {
    if (!svgMarkup) {
      return
    }
    setPreviewOpen(true)
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openPreview()
  }

  return (
    <>
      <Box className={wrapperClassName} sx={{ my: 3 }}>
        <Box
          className={canvasClassName}
          role={svgMarkup ? 'button' : undefined}
          tabIndex={svgMarkup ? 0 : undefined}
          aria-label={svgMarkup ? `打开放大${title}` : undefined}
          aria-busy={isLoading ? 'true' : undefined}
          data-zoomable={svgMarkup ? 'true' : undefined}
          onClick={svgMarkup ? openPreview : undefined}
          onKeyDown={svgMarkup ? handleKeyDown : undefined}
          sx={{ overflowX: 'auto' }}
        >
          {svgMarkup ? <Box dangerouslySetInnerHTML={{ __html: svgMarkup }} /> : null}
          {isLoading ? (
            <Box className="graphviz-loading">
              <span>loading</span>
              <span className="graphviz-loading-dots" aria-hidden="true" />
            </Box>
          ) : null}
          {errorMessage ? <pre className="graphviz-error">{errorMessage}</pre> : null}
        </Box>
        {svgMarkup ? (
          <Box
            component="button"
            type="button"
            className="graphviz-zoom-hint"
            onClick={openPreview}
          >
            点击放大
          </Box>
        ) : null}
      </Box>
      <SvgLightboxDialog open={previewOpen} onClose={closePreview} svgMarkup={svgMarkup} title={title} />
    </>
  )
}

function GraphvizBlock({ source, engine }) {
  const [svgMarkup, setSvgMarkup] = useState('')
  const [renderState, setRenderState] = useState('loading')
  const [renderError, setRenderError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      setSvgMarkup('')
      setRenderError('')
      setRenderState('loading')

      try {
        const response = await fetch('/api/render/graphviz', {
          body: JSON.stringify({ engine, source }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })
        if (!response.ok) {
          throw new Error(`Graphviz render failed with ${response.status}`)
        }
        const payload = await response.json()
        if (cancelled) {
          return
        }

        if (typeof payload.svg !== 'string' || !/<svg[\s>]/iu.test(payload.svg)) {
          throw new Error('Graphviz render returned no SVG content')
        }

        setSvgMarkup(payload.svg)
        setRenderState('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setSvgMarkup('')
        setRenderError(error instanceof Error ? error.message : String(error))
        setRenderState('error')
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [engine, source])

  return (
    <ZoomableSvgBlock
      svgMarkup={renderState === 'ready' ? svgMarkup : ''}
      title="Graphviz Preview"
      wrapperClassName="graphviz-wrapper"
      canvasClassName="graphviz"
      isLoading={renderState === 'loading'}
      errorMessage={renderState === 'error' ? `Graphviz render failed:\n${renderError}` : ''}
    />
  )
}

function SvgMarkupBlock({ source }) {
  if (!looksLikeSvgMarkup(source)) {
    return <pre className="graphviz-error">{'SVG render failed:\ncode block does not contain a root <svg>...</svg> element'}</pre>
  }

  return (
    <ZoomableSvgBlock
      svgMarkup={source.trim()}
      title="SVG Preview"
      wrapperClassName="svg-wireframe-wrapper"
      canvasClassName="svg-wireframe"
      isLoading={false}
      errorMessage=""
    />
  )
}

function MarkdownCodeBlock({ source, language }) {
  const normalizedLanguage = (language || '').trim().toLowerCase()
  const [collapsed, setCollapsed] = useState(false)

  if (normalizedLanguage === 'mermaid') {
    return <MermaidBlock source={source.trimEnd()} />
  }

  if (GRAPHVIZ_LANGUAGES.has(normalizedLanguage)) {
    return <GraphvizBlock source={source.trimEnd()} engine="dot" />
  }

  if (isRenderableSvgSource(normalizedLanguage, source)) {
    return <SvgMarkupBlock source={source.trimEnd()} />
  }

  const { className, markup } = getHighlightMarkup(source, normalizedLanguage)
  const lineCount = source.length === 0 ? 0 : source.split('\n').length
  const languageLabel = normalizedLanguage || 'text'
  const summaryLabel = `${languageLabel} · ${lineCount} line${lineCount === 1 ? '' : 's'}`

  return (
    <Box
      className="md-code-block"
      sx={{
        my: 3,
        borderRadius: 0,
        border: (theme) => `1px solid ${getMarkdownTokens(theme).codeBlock?.border || alpha(theme.palette.common.white, 0.08)}`,
        backgroundColor: (theme) => getMarkdownTokens(theme).codeBlock?.background || '#111827',
        boxShadow: (theme) => getMarkdownTokens(theme).codeBlock?.shadow || 'none',
        p: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: collapsed
            ? 'none'
            : (theme) =>
                `1px solid ${getMarkdownTokens(theme).codeBlock?.border || alpha(theme.palette.common.white, 0.08)}`,
          backgroundColor: (theme) => alpha(theme.palette.common.black, 0.16),
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: alpha('#e5e7eb', 0.82),
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
          }}
        >
          {summaryLabel}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          sx={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            color: alpha('#93c5fd', 0.95),
            cursor: 'pointer',
            px: 0,
            py: 0,
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: 'inherit',
            '&:hover': {
              color: '#bfdbfe',
            },
          }}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </Box>
      </Box>
      {!collapsed ? (
        <Box
          component="pre"
          sx={{
            m: 0,
            overflowX: 'auto',
          }}
        >
          <Box
            component="code"
            className={className}
            sx={{
              display: 'block',
              minWidth: 'max-content',
              px: 2,
              py: 1.75,
              backgroundColor: 'transparent',
              color: '#e5e7eb',
              fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
            }}
            dangerouslySetInnerHTML={{ __html: markup }}
          />
        </Box>
      ) : null}
    </Box>
  )
}

function renderMarkdownNode(node, key) {
  const { token, children } = node
  const attrs = getTokenAttributes(token)

  switch (token.type) {
    case 'inline':
      return <Fragment key={key}>{renderInlineChildren(token.children || [], `${key}-inline`)}</Fragment>
    case 'text':
      return <Fragment key={key}>{token.content}</Fragment>
    case 'softbreak':
      return <Fragment key={key}>{'\n'}</Fragment>
    case 'hardbreak':
      return <br key={key} />
    case 'code_inline':
      return (
        <Box
          key={key}
          component="code"
          sx={{
            px: 0.45,
            py: 0.15,
            borderRadius: 0,
            backgroundColor: (theme) => getMarkdownTokens(theme).inlineCode?.background || alpha(theme.palette.common.white, 0.06),
            border: (theme) => `1px solid ${getMarkdownTokens(theme).inlineCode?.border || alpha(theme.palette.common.white, 0.08)}`,
            fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
            fontSize: '0.92em',
          }}
        >
          {token.content}
        </Box>
      )
    case 'html_inline':
      return <Box key={key} component="span" dangerouslySetInnerHTML={{ __html: token.content }} />
    case 'html_block':
      if (looksLikeSvgMarkup(token.content)) {
        return <SvgMarkupBlock key={key} source={token.content} />
      }

      return (
        <Box
          key={key}
          component="div"
          sx={{ my: 2 }}
          dangerouslySetInnerHTML={{ __html: token.content }}
        />
      )
    case 'image':
      return (
        <Box
          key={key}
          component="img"
          src={attrs.src}
          alt={attrs.alt || token.content || ''}
          title={attrs.title}
          loading="lazy"
          sx={{ maxWidth: '100%', height: 'auto', display: 'block', my: 2 }}
        />
      )
    case 'paragraph_open':
      return (
        <Typography
          key={key}
          component="p"
          variant="body1"
          sx={{
            mt: 0,
            mb: (theme) => getMarkdownTokens(theme).body?.blockSpacing || 2,
            lineHeight: (theme) => getMarkdownTokens(theme).body?.lineHeight || 1.8,
          }}
        >
          {renderNodeChildren(children, `${key}-paragraph`)}
        </Typography>
      )
    case 'heading_open': {
      const level = Number(token.tag.replace('h', ''))
      const variant = HEADING_VARIANTS[level] || 'h6'
      const id = token.meta?.headingId || attrs.id
      const headingLevelConfig = (theme) => getMarkdownTokens(theme).headings?.levels?.[level] || {}

      return (
        <Typography
          key={key}
          component={token.tag}
          variant={variant}
          id={id}
          data-heading-id={id}
          sx={{
            scrollMarginTop: (theme) => getMarkdownTokens(theme).headings?.scrollMarginTop || '96px',
            mt: (theme) => headingLevelConfig(theme).mt ?? (level === 1 ? 0 : 4),
            mb: (theme) => headingLevelConfig(theme).mb ?? 2,
            color: 'common.white',
            ...(level <= 2
              ? {
                  pb: 0.75,
                  borderBottom: (theme) =>
                    headingLevelConfig(theme).border === false
                      ? 'none'
                      : `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                }
              : {}),
            transition: 'color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {renderNodeChildren(children, `${key}-heading`)}
        </Typography>
      )
    }
    case 'bullet_list_open':
      return (
        <Box
          key={key}
          component="ul"
          className={attrs.class}
          sx={{
            my: 2,
            pl: 3,
          }}
        >
          {renderNodeChildren(children, `${key}-ul`)}
        </Box>
      )
    case 'ordered_list_open': {
      const start = Number(attrs.start || 1)
      return (
        <Box
          key={key}
          component="ol"
          className={attrs.class}
          start={start > 1 ? start : undefined}
          sx={{
            my: 2,
            pl: 3,
          }}
        >
          {renderNodeChildren(children, `${key}-ol`)}
        </Box>
      )
    }
    case 'list_item_open': {
      const taskListMeta = token.meta?.taskListItem
      const listItemContent = renderNodeChildren(children, `${key}-li`)

      if (taskListMeta) {
        return (
          <Box
            key={key}
            component="li"
            className={attrs.class}
            sx={{
              my: 0.75,
              listStyle: 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.1 }}>
              <Checkbox
                checked={taskListMeta.checked}
                disabled
                disableRipple
                size="small"
                sx={{
                  mt: 0.05,
                  p: 0,
                  color: 'success.main',
                  '&.Mui-disabled': {
                    color: 'success.main',
                    opacity: taskListMeta.checked ? 1 : 0.55,
                  },
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>{listItemContent}</Box>
            </Box>
          </Box>
        )
      }

      return (
        <Box key={key} component="li" className={attrs.class} sx={{ my: 0.5 }}>
          {listItemContent}
        </Box>
      )
    }
    case 'blockquote_open':
      {
        const alert = getBlockquoteAlert(children)
        const blockquoteChildren = alert?.children || children
        const variantKey = alert?.variant
      return (
        <Box
          key={key}
          component="blockquote"
          data-blockquote-variant={variantKey || undefined}
          sx={{
            my: 2,
            mx: 0,
            pl: 2,
            pr: 1.5,
            py: 0.75,
            borderLeft: (theme) => {
              const blockquoteTokens = getMarkdownTokens(theme).blockquote || {}
              const variantTokens = variantKey ? blockquoteTokens.variants?.[variantKey] || {} : {}
              return `3px solid ${variantTokens.border || blockquoteTokens.border || theme.palette.primary.main}`
            },
            backgroundColor: (theme) => {
              const blockquoteTokens = getMarkdownTokens(theme).blockquote || {}
              const variantTokens = variantKey ? blockquoteTokens.variants?.[variantKey] || {} : {}
              return variantTokens.background || blockquoteTokens.background || 'transparent'
            },
            color: (theme) => {
              const blockquoteTokens = getMarkdownTokens(theme).blockquote || {}
              const variantTokens = variantKey ? blockquoteTokens.variants?.[variantKey] || {} : {}
              return variantTokens.text || blockquoteTokens.text || theme.palette.primary.light
            },
            '& > :last-child': {
              mb: 0,
            },
          }}
        >
          {alert ? (
            <Typography
              component="div"
              variant="overline"
              sx={{
                display: 'block',
                mb: 0.35,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: (theme) => {
                  const blockquoteTokens = getMarkdownTokens(theme).blockquote || {}
                  const variantTokens = variantKey ? blockquoteTokens.variants?.[variantKey] || {} : {}
                  return variantTokens.title || blockquoteTokens.title || theme.palette.common.white
                },
              }}
            >
              {alert.label}
            </Typography>
          ) : null}
          {renderNodeChildren(blockquoteChildren, `${key}-blockquote`)}
        </Box>
      )
      }
    case 'fence':
      return <MarkdownCodeBlock key={key} source={token.content} language={token.info.split(/\s+/u)[0] || ''} />
    case 'code_block':
      return <MarkdownCodeBlock key={key} source={token.content} language="" />
    case 'hr':
      return <Divider key={key} sx={{ my: 3, borderColor: 'divider' }} />
    case 'table_open':
      return (
        <TableContainer
          key={key}
          component={Box}
          sx={{
            my: 3,
            overflowX: 'auto',
            border: (theme) => `1px solid ${getMarkdownTokens(theme).table?.border || alpha(theme.palette.common.white, 0.08)}`,
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: '100%',
              '& td, & th': {
                borderColor: (theme) => getMarkdownTokens(theme).table?.border || theme.palette.divider,
              },
              '& tbody tr:nth-of-type(odd)': {
                backgroundColor: (theme) => getMarkdownTokens(theme).table?.rowStripe || 'transparent',
              },
            }}
          >
            {renderNodeChildren(children, `${key}-table`)}
          </Table>
        </TableContainer>
      )
    case 'thead_open':
      return <TableHead key={key}>{renderNodeChildren(children, `${key}-thead`)}</TableHead>
    case 'tbody_open':
      return <TableBody key={key}>{renderNodeChildren(children, `${key}-tbody`)}</TableBody>
    case 'tr_open':
      return <TableRow key={key}>{renderNodeChildren(children, `${key}-tr`)}</TableRow>
    case 'th_open':
      return (
        <TableCell
          key={key}
          component="th"
          scope="col"
          align={getCellAlign(token)}
          sx={{
            fontWeight: 700,
            color: 'common.white',
            backgroundColor: (theme) => getMarkdownTokens(theme).table?.headerBackground || 'transparent',
          }}
        >
          {renderNodeChildren(children, `${key}-th`)}
        </TableCell>
      )
    case 'td_open':
      return (
        <TableCell key={key} align={getCellAlign(token)}>
          {renderNodeChildren(children, `${key}-td`)}
        </TableCell>
      )
    case 'link_open': {
      const href = attrs.href || ''
      const external = isExternalHref(href)
      return (
        <Link
          key={key}
          href={href}
          title={attrs.title}
          underline="hover"
          color="primary.main"
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer noopener' : undefined}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {renderNodeChildren(children, `${key}-link`)}
        </Link>
      )
    }
    case 'strong_open':
      return (
        <Box key={key} component="strong" sx={{ fontWeight: 700 }}>
          {renderNodeChildren(children, `${key}-strong`)}
        </Box>
      )
    case 'em_open':
      return (
        <Box key={key} component="em">
          {renderNodeChildren(children, `${key}-em`)}
        </Box>
      )
    case 's_open':
      return (
        <Box key={key} component="s">
          {renderNodeChildren(children, `${key}-s`)}
        </Box>
      )
    default:
      if (children.length > 0) {
        return <Fragment key={key}>{renderNodeChildren(children, `${key}-children`)}</Fragment>
      }

      return token.content ? <Fragment key={key}>{token.content}</Fragment> : null
  }
}

export function MarkdownDocument({ articleRef, nodes, renderKey }) {
  return (
    <article key={renderKey} ref={articleRef} className="markdown-body">
      {nodes}
    </article>
  )
}

function getDocumentPrimaryTitle(source) {
  const markdown = source || ''
  const match = markdown.match(/^\s*#\s+(.+?)\s*$/m)
  if (match?.[1]) {
    return match[1].trim()
  }
  return ''
}

export function extractDocumentPrimaryTitle(source, fallbackTitle) {
  return getDocumentPrimaryTitle(source) || fallbackTitle
}

export function renderMarkdownDocument(source) {
  const { nodes, tocItems } = buildMarkdownNodes(source)

  return {
    nodes: nodes.map((node, index) => renderMarkdownNode(node, `md-${index}`)),
    tocItems,
    primaryTitle: getDocumentPrimaryTitle(source),
  }
}
