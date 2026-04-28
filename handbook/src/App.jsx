import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Link as MuiLink,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import './App.css'
import { MarkdownDocument, extractDocumentPrimaryTitle, renderMarkdownDocument } from './MarkdownDocument.jsx'
import { buildQuickAccessDocuments } from './quickAccess.js'
import {
  buildDirectoryPathSetFromFiles,
  buildFileTree,
  collectDirectoryPaths,
  countDirectories,
  reconcileExpandedItems,
} from './treeState.js'

const drawerWidth = 'clamp(280px, 20vw, 420px)'
const BASE_URL = import.meta.env.BASE_URL || '/'
const BASE_PATH = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
const RECENT_DOCUMENTS_KEY = 'handbook.recentDocuments'
const RECENT_DOCUMENTS_VERSION = 3
const DOCUMENT_SCROLL_STATE_KEY = 'handbook.documentScrollState'
const DOCUMENT_SCROLL_STATE_VERSION = 1
const MAX_RECENT_DOCUMENTS = 20
const MAX_QUICK_ACCESS_DOCUMENTS = 5
const DOCUMENT_POLL_INTERVAL_MS = 3000
const TREE_POLL_INTERVAL_MS = 5000
const API_FETCH_OPTIONS = { cache: 'no-store' }

function getDocumentRelativeLabel(selectionPath) {
  return selectionPath || ''
}

function buildTocTree(items) {
  const root = []
  const stack = []

  items.forEach((item) => {
    const node = { ...item, children: [] }

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  })

  return root
}

function countFiles(nodes) {
  return nodes.reduce((total, node) => {
    if (node.type !== 'directory') {
      return total + 1
    }
    return total + countFiles(node.children)
  }, 0)
}

function formatDocumentLength(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
    return '.md'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDocumentKindLabel(meta) {
  if (meta?.kind === 'slides') {
    return 'Slides'
  }
  return formatDocumentLength(meta?.bytes)
}

function getRecentDocumentLengthLabel(documentData) {
  if (documentData.content_type === 'slides') {
    return 'Slides'
  }

  return formatDocumentLength(getMarkdownByteLength(documentData.content_markdown))
}

function escapeMarkdownLinkLabel(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]')
}

function getMarkdownByteLength(source) {
  if (!source) {
    return 0
  }
  return new TextEncoder().encode(source).length
}

function TreeLabel({ node, fileMeta }) {
  const metaEntry = fileMeta[node.path]
  const meta =
    node.type === 'directory'
      ? `${countFiles(node.children)} docs`
      : node.type === 'slides'
        ? 'Slides project'
      : node.path.split('/').slice(0, -1).join('/') || 'Project root'
  const documentLength =
    node.type === 'directory' ? `${countFiles(node.children)} docs` : formatDocumentKindLabel(metaEntry)

  return (
    <Box className={`doc-tree-label-row ${node.type === 'directory' ? 'is-directory' : 'is-file'}`}>
      <Box className="doc-tree-label-main">
        <Box className="doc-tree-icon">
          {node.type === 'directory' ? (
            <FolderOpenRoundedIcon sx={{ fontSize: 18 }} />
          ) : node.type === 'slides' ? (
            <SlideshowRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <ArticleOutlinedIcon sx={{ fontSize: 18 }} />
          )}
        </Box>
        <Box className="doc-tree-copy">
          <span className="doc-tree-label">{node.name}</span>
          <span className="doc-tree-supporting">{meta}</span>
        </Box>
      </Box>
      <span className="doc-tree-count">{documentLength}</span>
    </Box>
  )
}

function renderTreeItems(nodes, fileMeta) {
  return nodes.map((node) => (
    <TreeItem
      key={node.path}
      itemId={node.path}
      label={<TreeLabel node={node} fileMeta={fileMeta} />}
      className={`doc-tree-item ${node.type}`}
    >
      {node.type === 'directory' ? renderTreeItems(node.children, fileMeta) : null}
    </TreeItem>
  ))
}

function tocNodeContainsActive(node, activeHeadingId) {
  if (node.id === activeHeadingId) {
    return true
  }
  return node.children.some((child) => tocNodeContainsActive(child, activeHeadingId))
}

function collectTocPathIds(nodes, targetId, path = []) {
  for (const node of nodes) {
    const nextPath = [...path, node.id]
    if (node.id === targetId) {
      return nextPath
    }

    const childPath = collectTocPathIds(node.children, targetId, nextPath)
    if (childPath.length > 0) {
      return childPath
    }
  }

  return []
}

function renderTocItems(nodes, { activeHeadingId, activePathIds, collapsedTocIds, onToggleTocNode }) {
  return (
    <Box component="ul">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0
        const isActive = node.id === activeHeadingId
        const inActivePath = activePathIds.includes(node.id)
        const inActiveBranch = !isActive && tocNodeContainsActive(node, activeHeadingId)
        const isCollapsed = hasChildren && collapsedTocIds.includes(node.id) && !inActivePath

        return (
          <Box key={node.id} component="li">
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.5 }}>
              {hasChildren ? (
                <Box
                  component="button"
                  type="button"
                  aria-label={isCollapsed ? `Expand ${node.text}` : `Collapse ${node.text}`}
                  aria-expanded={!isCollapsed}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onToggleTocNode(node.id)
                  }}
                  sx={(theme) => ({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 24,
                    px: 0,
                    border: 0,
                    background: 'transparent',
                    color: inActivePath ? theme.palette.primary.light : theme.palette.text.secondary,
                    cursor: 'pointer',
                    transition: 'color 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                      color: theme.palette.common.white,
                    },
                  })}
                >
                  {isCollapsed ? (
                    <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
                  )}
                </Box>
              ) : (
                <Box sx={{ width: 24, flexShrink: 0 }} />
              )}
              <MuiLink
                href={`#${node.id}`}
                underline="none"
                aria-current={isActive ? 'location' : undefined}
                data-toc-id={node.id}
                sx={(theme) => {
                  const toc = theme.handbookMarkdown?.toc || {}
                  return {
                    display: 'block',
                    flex: 1,
                    minWidth: 0,
                    px: 1,
                    py: 0.45,
                    borderLeft: `2px solid ${
                      isActive ? toc.activeBorder || alpha(theme.palette.primary.main, 0.34) : 'transparent'
                    }`,
                    backgroundColor: isActive ? toc.activeBackground || alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    color: isActive
                      ? toc.activeText || theme.palette.common.white
                      : inActiveBranch
                        ? toc.branchText || theme.palette.primary.light
                        : toc.text || theme.palette.text.secondary,
                    fontWeight: isActive ? 700 : inActiveBranch ? 600 : 500,
                    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                    '&:hover': {
                      color: toc.activeText || theme.palette.common.white,
                      backgroundColor: alpha(theme.palette.common.white, 0.04),
                    },
                  }
                }}
              >
                {node.text}
              </MuiLink>
            </Box>
            {hasChildren && !isCollapsed
              ? renderTocItems(node.children, {
                  activeHeadingId,
                  activePathIds,
                  collapsedTocIds,
                  onToggleTocNode,
                })
              : null}
          </Box>
        )
      })}
    </Box>
  )
}

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

function stripBasePath(pathname) {
  if (!BASE_PATH) {
    return pathname || '/'
  }

  if (!pathname) {
    return '/'
  }

  if (pathname === BASE_PATH) {
    return '/'
  }

  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || '/'
  }

  return pathname
}

function withBasePath(pathname) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!BASE_PATH) {
    return normalized
  }
  if (normalized === '/') {
    return `${BASE_PATH}/`
  }
  return `${BASE_PATH}${normalized}`
}

function buildApiPath(pathname) {
  return withBasePath(pathname)
}

function resolveSlidesAssetUrl(pathname) {
  if (!pathname) {
    return ''
  }

  return buildApiPath(pathname)
}

function isSlidesSelection(path) {
  return path.startsWith('slides/')
}

function routeToPath(pathname) {
  const localPath = stripBasePath(pathname)
  if (!localPath || localPath === '/') {
    return ''
  }

  const normalizedLocalPath = localPath.startsWith('/') ? localPath.slice(1) : localPath
  const [topLevel, ...remainderSegments] = normalizedLocalPath.split('/').filter(Boolean)
  if (!topLevel) {
    return ''
  }

  const baseDir = topLevel
  const remainder = remainderSegments.join('/')
  if (baseDir === 'slides') {
    if (!remainder) {
      return ''
    }
    if (remainder.endsWith('/index.html') || remainder === 'index.html') {
      return `${baseDir}/${remainder.replace(/\/index\.html$/u, '').replace(/^index\.html$/u, '').replace(/\/+$/u, '')}`
    }
    if (remainder.endsWith('.html')) {
      return `${baseDir}/${remainder.replace(/\/+$/u, '')}`
    }
    return `${baseDir}/${remainder.replace(/\/+$/u, '')}`
  }
  if (!remainder || remainder === 'README.md') {
    return `${baseDir}/README.md`
  }
  if (remainder.endsWith('.md')) {
    return `${baseDir}/${remainder}`
  }
  const normalizedRemainder = normalizePathname(remainder).replace(/^\/+/, '')
  return `${baseDir}/${normalizedRemainder}README.md`

}

function buildEntryRouteFromPath(path) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  if (normalizedPath.startsWith('slides/')) {
    const slidesPath = normalizedPath
      .replace(/^slides\//u, '')
      .replace(/\/index\.html$/u, '')
      .replace(/\/+$/u, '')
    return withBasePath(`/slides/${slidesPath}/`)
  }
  const segments = normalizedPath.split('/').filter(Boolean)
  if (segments.length === 0) {
    return withBasePath('/')
  }
  const [topLevel, ...rest] = segments
  const routeRoot = topLevel
  if (rest.length === 0) {
    return withBasePath(`/${routeRoot}/`)
  }
  return withBasePath(`/${routeRoot}/${rest.join('/')}`)
}

function detectDocumentRoots(paths, fileMeta) {
  const grouped = new Map()

  paths.forEach((path) => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) {
      return
    }

    const [root, ...rest] = segments
    const group =
      grouped.get(root) ||
      {
        id: root,
        title: root,
        readmePath: '',
        docCount: 0,
        bytes: 0,
      }

    group.docCount += 1
    group.bytes += fileMeta[path]?.bytes || 0

    if (rest.length === 1 && rest[0] === 'README.md') {
      group.readmePath = path
    }

    grouped.set(root, group)
  })

  return Array.from(grouped.values())
    .filter((group) => Boolean(group.readmePath))
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((group) => ({
      ...group,
      route: buildEntryRouteFromPath(group.readmePath),
    }))
}

function pathToRoute(path) {
  if (!path) {
    return withBasePath('/')
  }

  if (isSlidesSelection(path)) {
    return buildEntryRouteFromPath(path)
  }

  if (path.endsWith('/README.md')) {
    const directoryPath = path.slice(0, -'/README.md'.length)
    return buildEntryRouteFromPath(directoryPath)
  }

  const fallbackPath = path.startsWith('/') ? path.slice(1) : path
  return buildEntryRouteFromPath(fallbackPath)
}

function resolveTreeSelectionPath(itemId, filePathSet) {
  if (!itemId) {
    return ''
  }

  if (filePathSet.has(itemId)) {
    return itemId
  }

  const directoryReadmePath = `${itemId}/README.md`
  if (filePathSet.has(directoryReadmePath)) {
    return directoryReadmePath
  }

  return itemId
}

function remapMissingReadmeSelection(selectionPath, filePathSet, directoryPathSet) {
  if (!selectionPath) {
    return selectionPath
  }

  if (isSlidesSelection(selectionPath)) {
    return filePathSet.has(selectionPath) ? selectionPath : ''
  }

  if (filePathSet.has(selectionPath) || directoryPathSet.has(selectionPath)) {
    return selectionPath
  }

  if (selectionPath.endsWith('/README.md')) {
    const directoryPath = selectionPath.slice(0, -'/README.md'.length)
    if (directoryPathSet.has(directoryPath)) {
      return directoryPath
    }
  }

  return selectionPath
}

function buildDirectoryDocument(path, files, fileMeta) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  const prefix = normalizedPath ? `${normalizedPath}/` : ''
  const directoryName = normalizedPath.split('/').filter(Boolean).at(-1) || 'workspace'
  const childDirectories = new Map()
  const childFiles = []

  files.forEach((filePath) => {
    if (!filePath.startsWith(prefix)) {
      return
    }

    const remainder = filePath.slice(prefix.length)
    if (!remainder) {
      return
    }

    const segments = remainder.split('/').filter(Boolean)
    if (segments.length === 0) {
      return
    }

    if (segments.length === 1) {
      if (segments[0] !== 'README.md') {
        childFiles.push(filePath)
      }
      return
    }

    const childDirName = segments[0]
    const childDirPath = `${normalizedPath}/${childDirName}`
    if (!childDirectories.has(childDirPath)) {
      childDirectories.set(childDirPath, childDirName)
    }
  })

  childFiles.sort((left, right) => left.localeCompare(right))
  const sortedDirectories = Array.from(childDirectories.entries()).sort((left, right) => left[1].localeCompare(right[1]))

  const lines = [
    `# ${directoryName}`,
    '',
    `> Directory index for \`${normalizedPath}\`.`,
    '',
    `- 子目录数：${sortedDirectories.length}`,
    `- Markdown 文件数：${childFiles.length}`,
    '',
  ]

  if (sortedDirectories.length > 0) {
    lines.push('## 子目录', '')
    for (const [childDirPath, childDirName] of sortedDirectories) {
      lines.push(`- [${childDirName}](${pathToRoute(childDirPath)})`)
    }
    lines.push('')
  }

  if (childFiles.length > 0) {
    lines.push('## Markdown 文件', '')
    for (const childFile of childFiles) {
      const fileName = childFile.split('/').at(-1) || childFile
      const documentTitle = fileMeta[childFile]?.title || fileName
      lines.push(`- [${escapeMarkdownLinkLabel(documentTitle)}](${pathToRoute(childFile)})`)
    }
    lines.push('')
  }

  if (sortedDirectories.length === 0 && childFiles.length === 0) {
    lines.push('这个目录下当前没有可显示的 Markdown 文档。', '')
  }

  return {
    title: directoryName,
    source_label: normalizedPath,
    active_source: `directory:${normalizedPath}`,
    content_type: 'markdown',
    content_markdown: lines.join('\n'),
    slides_url: '',
  }
}

function scrollToHashTarget(hash) {
  if (!hash) {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return
  }

  const decodedHash = decodeURIComponent(hash.startsWith('#') ? hash.slice(1) : hash)
  if (!decodedHash) {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return
  }

  window.requestAnimationFrame(() => {
    const target =
      document.getElementById(decodedHash) ||
      document.querySelector(`[name="${CSS.escape(decodedHash)}"]`)

    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  })
}

function readSelection() {
  return {
    path: routeToPath(window.location.pathname),
    url: '',
  }
}

function updateSelection(nextSelection) {
  let href = withBasePath('/')

  if (nextSelection.path) {
    href = pathToRoute(nextSelection.path)
  }

  window.history.pushState({}, '', href)
}

function readRecentDocuments() {
  try {
    const raw = window.localStorage.getItem(RECENT_DOCUMENTS_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return []
    }

    if (parsed.version !== RECENT_DOCUMENTS_VERSION || !Array.isArray(parsed.items)) {
      window.localStorage.removeItem(RECENT_DOCUMENTS_KEY)
      return []
    }

    return parsed.items.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.path === 'string' &&
        item.path,
    )
  } catch {
    return []
  }
}

function getSelectionStorageKey(selectionPath) {
  if (selectionPath) {
    return `path:${selectionPath}`
  }
  return ''
}

function readDocumentScrollState() {
  try {
    const raw = window.localStorage.getItem(DOCUMENT_SCROLL_STATE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    if (parsed.version !== DOCUMENT_SCROLL_STATE_VERSION || !parsed.items || typeof parsed.items !== 'object') {
      window.localStorage.removeItem(DOCUMENT_SCROLL_STATE_KEY)
      return {}
    }

    return parsed.items
  } catch {
    return {}
  }
}

function writeDocumentScrollState(items) {
  try {
    window.localStorage.setItem(
      DOCUMENT_SCROLL_STATE_KEY,
      JSON.stringify({
        version: DOCUMENT_SCROLL_STATE_VERSION,
        items,
      }),
    )
  } catch {
    // Ignore localStorage write failures.
  }
}

function writeRecentDocuments(items) {
  try {
    window.localStorage.setItem(
      RECENT_DOCUMENTS_KEY,
      JSON.stringify({
        version: RECENT_DOCUMENTS_VERSION,
        items: items.slice(0, MAX_RECENT_DOCUMENTS),
      }),
    )
  } catch {
    // Ignore localStorage write failures.
  }
}

function upsertRecentDocument(currentItems, nextItem) {
  const deduped = currentItems.filter((item) => item.path !== nextItem.path)

  return [nextItem, ...deduped].slice(0, MAX_RECENT_DOCUMENTS)
}

function buildDocumentEndpoint(selectionPath) {
  const params = new URLSearchParams()
  if (selectionPath) {
    params.set('path', selectionPath)
  }

  return params.toString()
    ? `${buildApiPath('/api/document')}?${params.toString()}`
    : buildApiPath('/api/document')
}

function areStringArraysEqual(left, right) {
  if (left === right) {
    return true
  }

  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function areFileMetaEqual(left, right) {
  if (left === right) {
    return true
  }

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every(
    (key) =>
      left[key]?.bytes === right[key]?.bytes &&
      left[key]?.title === right[key]?.title &&
      left[key]?.kind === right[key]?.kind,
  )
}

function areDocumentPayloadsEqual(left, right) {
  return (
    left.title === right.title &&
    left.source_label === right.source_label &&
    left.active_source === right.active_source &&
    left.content_markdown === right.content_markdown &&
    left.content_type === right.content_type &&
    left.slides_url === right.slides_url
  )
}

function App({ themeMode, onToggleTheme }) {
  const articleRef = useRef(null)
  const tocRef = useRef(null)
  const activeHeadingElementRef = useRef(null)
  const documentScrollStateRef = useRef(readDocumentScrollState())
  const scrollRestoreKeyRef = useRef('')
  const selectionRef = useRef(readSelection())
  const filesRef = useRef([])
  const fileMetaRef = useRef({})
  const documentDataRef = useRef({
    title: 'handbook',
    source_label: 'Project root',
    active_source: 'home',
    content_type: 'markdown',
    content_markdown: '',
    slides_url: '',
  })
  const documentErrorRef = useRef('')
  const [selection, setSelection] = useState(readSelection())
  const [documentRevision, setDocumentRevision] = useState(0)
  const [files, setFiles] = useState([])
  const [fileMeta, setFileMeta] = useState({})
  const [filesLoading, setFilesLoading] = useState(true)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [expandedItems, setExpandedItems] = useState([])
  const [activeHeadingId, setActiveHeadingId] = useState('')
  const [collapsedTocIds, setCollapsedTocIds] = useState([])
  const [recentDocuments, setRecentDocuments] = useState(() => readRecentDocuments())
  const [documentData, setDocumentData] = useState({
    title: 'handbook',
    source_label: 'Project root',
    active_source: 'home',
    content_type: 'markdown',
    content_markdown: '',
    slides_url: '',
  })
  const [renderedDocument, setRenderedDocument] = useState({
    nodes: [],
    tocItems: [],
    primaryTitle: '',
  })
  const [isPageVisible, setIsPageVisible] = useState(() => !document.hidden)

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    fileMetaRef.current = fileMeta
  }, [fileMeta])

  useEffect(() => {
    documentDataRef.current = documentData
  }, [documentData])

  useEffect(() => {
    documentErrorRef.current = documentError
  }, [documentError])

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    })
  }, [])

  useEffect(() => {
    setRenderedDocument(renderMarkdownDocument(documentData.content_markdown || '', themeMode))
  }, [documentData.content_markdown, documentRevision, themeMode])

  useEffect(() => {
    const syncSelection = () => {
      const nextSelection = readSelection()
      setSelection(nextSelection)
    }

    window.addEventListener('popstate', syncSelection)
    return () => window.removeEventListener('popstate', syncSelection)
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadFiles() {
      setFilesLoading(true)
      try {
        const response = await fetch(buildApiPath('/api/tree'), API_FETCH_OPTIONS)
        if (!response.ok) {
          throw new Error(`Tree request failed with ${response.status}`)
        }
        const payload = await response.json()
        if (!cancelled) {
          const nextFiles = payload.files || []
          const nextFileMeta = payload.file_meta || {}
          filesRef.current = nextFiles
          fileMetaRef.current = nextFileMeta
          setFiles(nextFiles)
          setFileMeta(nextFileMeta)
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentError(error.message)
        }
      } finally {
        if (!cancelled) {
          setFilesLoading(false)
        }
      }
    }

    loadFiles()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (filesLoading || !selection.path) {
      return
    }

    const nextFilePathSet = new Set(files)
    const nextDirectoryPathSet = buildDirectoryPathSetFromFiles(files)
    const remappedPath = remapMissingReadmeSelection(selection.path, nextFilePathSet, nextDirectoryPathSet)
    if (remappedPath !== selection.path) {
      const nextSelection = { path: remappedPath, url: '' }
      updateSelection(nextSelection)
      setSelection(nextSelection)
    }
  }, [files, filesLoading, selection.path])

  useEffect(() => {
    let cancelled = false

    async function loadDocument() {
      setDocumentLoading(true)
      setDocumentError('')

      const nextFilePathSet = new Set(files)
      const nextDirectoryPathSet = buildDirectoryPathSetFromFiles(files)

      if (selection.path && nextDirectoryPathSet.has(selection.path) && !nextFilePathSet.has(selection.path)) {
        const payload = buildDirectoryDocument(selection.path, files, fileMeta)
        if (!cancelled) {
          documentDataRef.current = payload
          setDocumentData(payload)
          setDocumentLoading(false)
        }
        return
      }

      try {
        const response = await fetch(buildDocumentEndpoint(selection.path), API_FETCH_OPTIONS)
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.detail || `Document request failed with ${response.status}`)
        }
        if (!cancelled) {
          documentDataRef.current = payload
          setDocumentData(payload)
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentError(error.message)
          const unavailableDocument = {
            title: 'Unavailable',
            source_label: selection.path || 'Request failed',
            active_source: 'error',
            content_type: 'markdown',
            content_markdown: '',
            slides_url: '',
          }
          documentDataRef.current = unavailableDocument
          setDocumentData(unavailableDocument)
        }
      } finally {
        if (!cancelled) {
          setDocumentLoading(false)
        }
      }
    }

    loadDocument()
    return () => {
      cancelled = true
    }
  }, [selection.path, documentRevision, files, fileMeta])

  useEffect(() => {
    if (!isPageVisible) {
      return undefined
    }

    let cancelled = false

    async function refreshFiles() {
      try {
        const response = await fetch(buildApiPath('/api/tree'), API_FETCH_OPTIONS)
        if (!response.ok) {
          return
        }

        const payload = await response.json()
        if (cancelled) {
          return
        }

        const nextFiles = payload.files || []
        const nextFileMeta = payload.file_meta || {}
        if (!areStringArraysEqual(filesRef.current, nextFiles)) {
          filesRef.current = nextFiles
          setFiles(nextFiles)
        }
        if (!areFileMetaEqual(fileMetaRef.current, nextFileMeta)) {
          fileMetaRef.current = nextFileMeta
          setFileMeta(nextFileMeta)
        }
      } catch {
        // Keep the current view stable on transient poll failures.
      }
    }

    refreshFiles()
    const intervalId = window.setInterval(refreshFiles, TREE_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [isPageVisible])

  useEffect(() => {
    if (!isPageVisible || !selection.path) {
      return undefined
    }

    let cancelled = false

    async function refreshDocument() {
      try {
        const response = await fetch(buildDocumentEndpoint(selectionRef.current.path), API_FETCH_OPTIONS)
        const payload = await response.json()
        if (!response.ok || cancelled) {
          return
        }

        if (!areDocumentPayloadsEqual(documentDataRef.current, payload)) {
          documentDataRef.current = payload
          setDocumentData(payload)
        }
        if (documentErrorRef.current) {
          documentErrorRef.current = ''
          setDocumentError('')
        }
      } catch {
        // Keep the current view stable on transient poll failures.
      }
    }

    refreshDocument()
    const intervalId = window.setInterval(refreshDocument, DOCUMENT_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [isPageVisible, selection.path])

  useEffect(() => {
    if (documentLoading || documentError) {
      return
    }

    if (!selection.path) {
      return
    }

    const recentItem = {
      title: extractDocumentPrimaryTitle(
        documentData.content_markdown,
        documentData.title || selection.path.split('/').at(-1),
      ),
      sourceLabel: getDocumentRelativeLabel(selection.path),
      lengthLabel: getRecentDocumentLengthLabel(documentData),
      path: selection.path || '',
      visitedAt: new Date().toISOString(),
    }

    setRecentDocuments((current) => {
      const next = upsertRecentDocument(current, recentItem)
      writeRecentDocuments(next)
      return next
    })
  }, [
    documentData.source_label,
    documentData.content_markdown,
    documentData.title,
    documentError,
    documentLoading,
    selection.path,
  ])

  const showHome = !selection.path
  const isSlidesDocument = documentData.content_type === 'slides'
  const slidesAssetUrl = resolveSlidesAssetUrl(documentData.slides_url)
  const hasDocument = renderedDocument.nodes.length > 0
  const fileTree = buildFileTree(files)
  const directoryCount = countDirectories(fileTree)
  const filePathSet = new Set(files)
  const directoryPathSet = collectDirectoryPaths(fileTree)
  const documentRoots = detectDocumentRoots(files, fileMeta)
  const quickAccessDocuments = buildQuickAccessDocuments(recentDocuments, {
    filePathSet,
    limit: MAX_QUICK_ACCESS_DOCUMENTS,
  })
  const tocTree = buildTocTree(renderedDocument.tocItems)
  const activeTocPathIds = collectTocPathIds(tocTree, activeHeadingId)
  const activeHeadingIndex = renderedDocument.tocItems.findIndex((item) => item.id === activeHeadingId)
  const activeHeadingNumber = activeHeadingIndex >= 0 ? activeHeadingIndex + 1 : 0
  const activeHeadingProgress =
    renderedDocument.tocItems.length > 0 ? (activeHeadingNumber / renderedDocument.tocItems.length) * 100 : 0
  const activeHeadingText =
    activeHeadingIndex >= 0 ? renderedDocument.tocItems[activeHeadingIndex]?.text || '' : renderedDocument.tocItems[0]?.text || ''
  const visibleDocumentTitle =
    !showHome && renderedDocument.primaryTitle ? renderedDocument.primaryTitle : documentData.title
  function handleLocalSelect(path) {
    const nextSelection = { path, url: '' }
    updateSelection(nextSelection)
    setSelection(nextSelection)
    if (path === selection.path) {
      setDocumentRevision((current) => current + 1)
    }
  }

  function handleGoHome() {
    const nextSelection = { path: '', url: '' }
    updateSelection(nextSelection)
    setSelection(nextSelection)
  }

  function handleRecentSelect(item) {
    const nextSelection = { path: item.path, url: '' }
    updateSelection(nextSelection)
    setSelection(nextSelection)
    if (nextSelection.path === selection.path) {
      setDocumentRevision((current) => current + 1)
    }
  }

  function handleClearRecentDocuments() {
    writeRecentDocuments([])
    setRecentDocuments([])
  }

  function handleDocumentNavigation(event) {
    const link = event.target.closest('a[href]')
    if (!link) {
      return
    }

    const href = link.getAttribute('href') || ''
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return
    }

    const target = link.getAttribute('target')
    if (target && target !== '_self') {
      return
    }

    const nextUrl = new URL(href, window.location.href)
    if (nextUrl.origin !== window.location.origin) {
      return
    }

    const nextSelection = {
      path: routeToPath(nextUrl.pathname),
      url: '',
    }
    const currentSelection = readSelection()
    const selectionChanged =
      nextSelection.path !== currentSelection.path || nextSelection.url !== currentSelection.url

    if (!selectionChanged && nextUrl.hash === window.location.hash) {
      event.preventDefault()
      updateSelection(nextSelection)
      setSelection(nextSelection)
      setDocumentRevision((current) => current + 1)
      scrollToHashTarget('')
      return
    }

    event.preventDefault()

    if (selectionChanged) {
      window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
      setSelection(nextSelection)
      return
    }

    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
    scrollToHashTarget(nextUrl.hash)
  }

  useEffect(() => {
    setExpandedItems((current) => {
      const next = reconcileExpandedItems(current, files, selection.path)
      return areStringArraysEqual(current, next) ? current : next
    })
  }, [files, selection.path])

  useEffect(() => {
    const targets = [articleRef.current, tocRef.current].filter(Boolean)
    if (targets.length === 0) {
      return undefined
    }

    const listener = (event) => {
      handleDocumentNavigation(event)
    }

    targets.forEach((target) => {
      target.addEventListener('click', listener, true)
    })

    return () => {
      targets.forEach((target) => {
        target.removeEventListener('click', listener, true)
      })
    }
  }, [renderedDocument.nodes, renderedDocument.tocItems, selection.path])

  useEffect(() => {
    if (documentLoading) {
      return
    }

    if (window.location.hash) {
      scrollToHashTarget(window.location.hash)
      return
    }

    const selectionKey = getSelectionStorageKey(selection.path)
    if (!selectionKey) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }

    if (scrollRestoreKeyRef.current === selectionKey) {
      return
    }

    const savedTop = documentScrollStateRef.current[selectionKey]

    if (typeof savedTop === 'number' && savedTop >= 0) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedTop, behavior: 'auto' })
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    scrollRestoreKeyRef.current = selectionKey
  }, [documentLoading, renderedDocument.nodes, selection.path])

  useEffect(() => {
    scrollRestoreKeyRef.current = ''
  }, [selection.path])

  useEffect(() => {
    setCollapsedTocIds([])
  }, [selection.path])

  useEffect(() => {
    if (!articleRef.current || renderedDocument.tocItems.length === 0) {
      setActiveHeadingId('')
      return undefined
    }

    const headings = Array.from(articleRef.current.querySelectorAll('[data-heading-id]'))
    if (headings.length === 0) {
      setActiveHeadingId('')
      return undefined
    }

    const updateActiveHeading = () => {
      const topOffset = 128
      let nextActiveHeadingId = headings[0]?.id || ''

      headings.forEach((heading) => {
        if (heading.getBoundingClientRect().top - topOffset <= 0) {
          nextActiveHeadingId = heading.id
        }
      })

      setActiveHeadingId((current) => (current === nextActiveHeadingId ? current : nextActiveHeadingId))
    }

    let frameId = 0

    const scheduleActiveHeadingUpdate = () => {
      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateActiveHeading()
      })
    }

    updateActiveHeading()
    window.addEventListener('scroll', scheduleActiveHeadingUpdate, { passive: true })
    window.addEventListener('resize', scheduleActiveHeadingUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleActiveHeadingUpdate)
      window.removeEventListener('resize', scheduleActiveHeadingUpdate)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [renderedDocument.tocItems, selection.path])

  useEffect(() => {
    const previousActiveHeading = activeHeadingElementRef.current
    if (previousActiveHeading && previousActiveHeading.id !== activeHeadingId) {
      previousActiveHeading.removeAttribute('data-heading-active')
      activeHeadingElementRef.current = null
    }

    if (!articleRef.current || !activeHeadingId) {
      return
    }

    const escapedHeadingId = window.CSS?.escape ? window.CSS.escape(activeHeadingId) : activeHeadingId
    const nextActiveHeading = articleRef.current.querySelector(`#${escapedHeadingId}`)
    if (!nextActiveHeading) {
      return
    }

    nextActiveHeading.setAttribute('data-heading-active', 'true')
    activeHeadingElementRef.current = nextActiveHeading
  }, [activeHeadingId, renderedDocument.tocItems])

  useEffect(() => {
    if (!tocRef.current || !activeHeadingId) {
      return
    }

    const escapedHeadingId = window.CSS?.escape ? window.CSS.escape(activeHeadingId) : activeHeadingId
    const selector = `[data-toc-id="${escapedHeadingId}"]`
    const activeLink = tocRef.current.querySelector(selector)
    activeLink?.scrollIntoView({ block: 'nearest' })
  }, [activeHeadingId])

  const handleToggleTocNode = (nodeId) => {
    setCollapsedTocIds((current) =>
      current.includes(nodeId) ? current.filter((item) => item !== nodeId) : [...current, nodeId],
    )
  }

  useEffect(() => {
    if (!selection.path) {
      return undefined
    }

    const selectionKey = getSelectionStorageKey(selection.path)
    if (!selectionKey) {
      return undefined
    }

    let flushTimeoutId = 0

    const saveScrollPosition = () => {
      documentScrollStateRef.current = {
        ...documentScrollStateRef.current,
        [selectionKey]: window.scrollY,
      }

      if (flushTimeoutId) {
        return
      }

      flushTimeoutId = window.setTimeout(() => {
        flushTimeoutId = 0
        writeDocumentScrollState(documentScrollStateRef.current)
      }, 180)
    }

    const flushScrollPosition = () => {
      if (flushTimeoutId) {
        window.clearTimeout(flushTimeoutId)
        flushTimeoutId = 0
      }
      writeDocumentScrollState(documentScrollStateRef.current)
    }

    window.addEventListener('scroll', saveScrollPosition, { passive: true })
    window.addEventListener('pagehide', flushScrollPosition)

    return () => {
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('pagehide', flushScrollPosition)
      flushScrollPosition()
    }
  }, [selection.path])

  const sidebarPanel = (
    <Card className="mui-panel-card workspace-sidebar-card">
      <CardHeader
        avatar={<AccountTreeRoundedIcon color="primary" />}
        title={
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, cursor: 'pointer' }}
            onClick={handleGoHome}
          >
            Markdown Directory Tree
          </Typography>
        }
        subheader={
          filesLoading ? 'Loading documentation index...' : `${files.length} files · ${directoryCount} directories`
        }
      />
      <CardContent
        sx={{ pt: 0, overflowY: 'auto', overflowX: 'hidden', minWidth: 0, flex: 1, minHeight: 0 }}
      >
        <Box className="sidebar-quick-access">
          <Box className="sidebar-quick-access-header">
            <Typography variant="overline" className="sidebar-quick-access-title">
              Quick Access
            </Typography>
            <Typography variant="caption" className="sidebar-quick-access-count">
              {quickAccessDocuments.length} / {MAX_QUICK_ACCESS_DOCUMENTS}
            </Typography>
          </Box>

          {quickAccessDocuments.length > 0 ? (
            <Box className="sidebar-quick-access-list">
              {quickAccessDocuments.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={
                    item.path === selection.path
                      ? 'sidebar-quick-access-item is-active'
                      : 'sidebar-quick-access-item'
                  }
                  onClick={() => handleRecentSelect(item)}
                >
                  <span className="sidebar-quick-access-path">
                    {item.title || item.path.split('/').filter(Boolean).at(-1) || item.path}
                  </span>
                  <span className="sidebar-quick-access-description">{item.path}</span>
                </button>
              ))}
            </Box>
          ) : (
            <Typography className="mui-empty">
              Open Markdown files to populate Quick Access with your latest 5 documents.
            </Typography>
          )}
        </Box>

        {filesLoading ? (
          <Typography className="mui-empty">Loading Markdown index...</Typography>
        ) : (
          <SimpleTreeView
            className="doc-tree-view"
            expandedItems={expandedItems}
            selectedItems={selection.path || undefined}
            onExpandedItemsChange={(event, itemIds) => setExpandedItems(itemIds)}
            onItemClick={(event, itemId) => {
              const nextPath = resolveTreeSelectionPath(itemId, filePathSet)

              if (directoryPathSet.has(itemId)) {
                setExpandedItems((current) =>
                  current.includes(itemId) ? current.filter((entry) => entry !== itemId) : [...current, itemId],
                )

                if (nextPath && nextPath !== itemId) {
                  handleLocalSelect(nextPath)
                }
                return
              }

              if (nextPath) {
                handleLocalSelect(nextPath)
              }
            }}
            slots={{
              collapseIcon: ExpandMoreRoundedIcon,
              expandIcon: ChevronRightRoundedIcon,
              endIcon: ArticleOutlinedIcon,
            }}
            sx={{
              overflowX: 'hidden',
              minWidth: 0,
            }}
          >
            {renderTreeItems(fileTree, fileMeta)}
          </SimpleTreeView>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box className={`mui-shell theme-${themeMode}`}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={(theme) => ({
          borderBottom: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 1 : 0.9)}`,
          backdropFilter: 'blur(18px)',
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(2, 6, 23, 0.65)'
              : 'rgba(248, 250, 252, 0.82)',
        })}
      >
        <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap' }}>
          <Stack
            spacing={0.5}
            sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
            onClick={handleGoHome}
          >
            <Typography variant="overline" sx={{ color: 'primary.light', letterSpacing: '0.12em' }}>
              {showHome ? 'Documentation Hub' : 'Markdown Viewer'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
              handbook
            </Typography>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={onToggleTheme}
            startIcon={themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          >
            {themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>

        </Toolbar>
      </AppBar>
      <Box
        className={`workspace-layout${!showHome && isSlidesDocument ? ' has-embedded-slides' : ''}`}
        sx={{ px: 2.5, pb: 2.5, pt: 2 }}
      >
        {showHome ? (
          <Box
            className="workspace-sidebar"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
            }}
          >
            {sidebarPanel}
          </Box>
        ) : null}

        <Box component="main" className={`workspace-main${!showHome && isSlidesDocument ? ' slides-main' : ''}`}>
        {documentError ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {documentError}
          </Alert>
        ) : null}

        {showHome && !documentLoading ? (
          <Box className="home-layout">
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Card className="mui-panel-card mui-hero-card">
                <CardContent sx={{ p: 2.5 }}>
                  <Chip label="Library" color="primary" variant="outlined" />
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                    Document Hub
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary', maxWidth: 760 }}>
                    首页聚焦最近访问过的 Markdown 文档，并保留完整目录树作为浏览入口。
                  </Typography>
                </CardContent>
              </Card>

              <Card className="mui-panel-card">
                <CardHeader
                  avatar={<HomeRoundedIcon color="primary" />}
                  title="Top-level Documents"
                  subheader={`${documentRoots.length} projects with top-level README.md`}
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  {documentRoots.length > 0 ? (
                    <Box className="quick-link-grid">
                      {documentRoots.map((item) => (
                        <a
                          key={item.id}
                          className="quick-link-card"
                          href={item.route}
                          onClick={(event) => {
                            event.preventDefault()
                            handleLocalSelect(item.readmePath)
                          }}
                        >
                          <Box className="quick-link-meta">
                            <span className="quick-link-eyebrow">Project</span>
                            <span className="quick-link-protocol">README</span>
                          </Box>
                          <strong>{item.title}</strong>
                          <span>{item.docCount} docs</span>
                          <span className="quick-link-url">{item.route}</span>
                        </a>
                      ))}
                    </Box>
                  ) : (
                    <Typography className="mui-empty">
                      No top-level README.md entrypoints were detected in the current document tree.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card className="mui-panel-card">
                <CardHeader
                  avatar={<HistoryRoundedIcon color="primary" />}
                  title="Recent Documents"
                  subheader={`${recentDocuments.length} / ${MAX_RECENT_DOCUMENTS}`}
                  action={
                    recentDocuments.length > 0 ? (
                      <Button size="small" variant="text" onClick={handleClearRecentDocuments}>
                        Clear
                      </Button>
                    ) : null
                  }
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  {recentDocuments.length > 0 ? (
                    <Box className="recent-doc-grid">
                      {recentDocuments.map((item) => (
                        <a
                          key={item.path}
                          className="quick-link-card recent-doc-card"
                          href={pathToRoute(item.path)}
                          onClick={(event) => {
                            event.preventDefault()
                            handleRecentSelect(item)
                          }}
                        >
                          <Box className="quick-link-meta">
                            <span className="quick-link-eyebrow">Recent</span>
                            <span className="quick-link-protocol">
                              {item.lengthLabel === 'Slides' ? 'Slides' : 'Markdown'}
                            </span>
                          </Box>
                          <strong>{item.title}</strong>
                          <span>{item.lengthLabel || '.md'}</span>
                          <span className="quick-link-url">{pathToRoute(item.path)}</span>
                        </a>
                      ))}
                    </Box>
                  ) : (
                    <Typography className="mui-empty">
                      Open a document from the left directory tree. Recent items will appear here automatically.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Box>
        ) : (
          <Box className={`doc-shell has-sidebar${isSlidesDocument ? ' slides-mode' : ''}`}>
            <Box className="workspace-sidebar doc-shell-sidebar">{sidebarPanel}</Box>
            <Card className={`mui-panel-card doc-article-card${isSlidesDocument ? ' slides-article-card' : ''}`}>
              <CardContent className={isSlidesDocument ? 'slides-article-content' : undefined} sx={{ p: 2.5 }}>
                {!isSlidesDocument ? (
                  <Box className="doc-viewer-header">
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip label={documentData.source_label} color="primary" variant="outlined" />
                    </Stack>
                  </Box>
                ) : null}
                {documentLoading ? (
                  <Typography className="mui-empty">Loading document content...</Typography>
                ) : isSlidesDocument ? (
                  <Stack spacing={2} className="slides-embed-shell">
                    <Box
                      className="slides-embed-header"
                      sx={(theme) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        p: 1.5,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      })}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Embedded slides
                        </Typography>
                      </Box>
                      {slidesAssetUrl ? (
                        <Button
                          component="a"
                          href={slidesAssetUrl}
                          target="_blank"
                          rel="noreferrer"
                          variant="outlined"
                          size="small"
                          endIcon={<OpenInNewRoundedIcon />}
                        >
                          Open standalone
                        </Button>
                      ) : null}
                    </Box>
                    {slidesAssetUrl ? (
                      <Box
                        className="slides-frame-wrap"
                        sx={(theme) => ({
                          position: 'relative',
                          overflow: 'hidden',
                          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(180deg, rgba(11,16,28,0.96) 0%, rgba(9,13,23,0.98) 100%)'
                              : 'linear-gradient(180deg, rgba(244,247,252,0.96) 0%, rgba(236,240,247,0.98) 100%)',
                        })}
                      >
                        <Box
                          component="iframe"
                          className="slides-frame"
                          title={documentData.title || 'Slides preview'}
                          src={slidesAssetUrl}
                          loading="lazy"
                          sx={{
                            display: 'block',
                            width: '100%',
                            border: 0,
                            backgroundColor: 'transparent',
                          }}
                        />
                      </Box>
                    ) : (
                      <Typography className="mui-empty">Slides entry is unavailable.</Typography>
                    )}
                  </Stack>
                ) : hasDocument ? (
                  <MarkdownDocument
                    articleRef={articleRef}
                    nodes={renderedDocument.nodes}
                    renderKey={`${selection.path || documentData.source_label}:${documentRevision}`}
                  />
                ) : (
                  <Typography className="mui-empty">No document content available.</Typography>
                )}
              </CardContent>
            </Card>

            <Card className="mui-panel-card doc-toc-card">
              <CardHeader
                avatar={<DescriptionRoundedIcon color="primary" />}
                title="Document Structure"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
                subheader={
                  hasDocument && renderedDocument.tocItems.length > 0
                    ? `${activeHeadingNumber || 1} / ${renderedDocument.tocItems.length} sections`
                    : undefined
                }
              />
              <CardContent className="doc-toc-content" sx={{ pt: 0, minWidth: 0 }}>
                {documentLoading ? (
                  <Typography className="mui-empty">Building document outline...</Typography>
                ) : isSlidesDocument ? (
                  <Typography className="mui-empty">Slides projects do not provide a Markdown outline.</Typography>
                ) : hasDocument ? (
                  <>
                    {renderedDocument.tocItems.length > 0 ? (
                      <Box
                        sx={(theme) => {
                          const toc = theme.handbookMarkdown?.toc || {}
                          return {
                            mb: 1.25,
                            px: 1.1,
                            py: 1,
                            border: `1px solid ${toc.activeBorder || alpha(theme.palette.primary.main, 0.24)}`,
                            backgroundColor: toc.activeBackground || alpha(theme.palette.primary.main, 0.08),
                          }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            Current section
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {activeHeadingNumber || 1}/{renderedDocument.tocItems.length}
                          </Typography>
                        </Stack>
                        <Box
                          sx={(theme) => ({
                            height: 6,
                            backgroundColor:
                              theme.handbookMarkdown?.toc?.progressTrack || alpha(theme.palette.common.white, 0.08),
                            overflow: 'hidden',
                          })}
                        >
                          <Box
                            sx={(theme) => ({
                              width: `${activeHeadingProgress}%`,
                              height: '100%',
                              backgroundColor: theme.handbookMarkdown?.toc?.progressFill || theme.palette.primary.main,
                              transition: 'width 0.2s ease',
                            })}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ mt: 0.8, color: 'text.primary', fontWeight: 600 }}>
                          {activeHeadingText || 'Start reading'}
                        </Typography>
                      </Box>
                    ) : null}
                    <nav ref={tocRef} className="toc-nav mui-sidebar-toc">
                      {tocTree.length > 0 ? (
                        renderTocItems(tocTree, {
                          activeHeadingId,
                          activePathIds: activeTocPathIds,
                          collapsedTocIds,
                          onToggleTocNode: handleToggleTocNode,
                        })
                      ) : (
                        <Typography className="mui-empty">No headings available.</Typography>
                      )}
                    </nav>
                  </>
                ) : (
                  <Typography className="mui-empty">No headings available.</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
        </Box>
      </Box>
    </Box>
  )
}

export default App
