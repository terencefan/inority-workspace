import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type FetchLike = typeof fetch
type GraphvizModule = typeof import('@viz-js/viz')
type GraphvizRenderOptions = {
  engine: string
  source: string
  themeMode: 'dark' | 'light'
}
type GraphvizTextOp = {
  text: string
  width: number
}

type TreeNode = {
  name: string
  path: string
  type: 'file' | 'directory' | 'slides'
  children?: TreeNode[]
}

type MarkdownPayload = {
  content_type?: 'markdown' | 'slides'
  title: string
  source_label: string
  active_source: string
  content_markdown: string
  slides_url?: string
}

type FileMeta = {
  bytes: number
  kind?: 'markdown' | 'slides'
  title: string
}

type TreeResponse = {
  files: string[]
  file_meta: Record<string, FileMeta>
  tree: TreeNode[]
}

type DocumentResponse = MarkdownPayload

export type HandbookServerOptions = {
  fetchImpl?: FetchLike
  graphvizCommandPath?: string
  graphvizModulePath?: string
  ripgrepCommandPath?: string
  siteDistDir: string
  showHiddenInTree?: boolean
  workspaceDir: string
}

type NormalizedOptions = {
  fetchImpl: FetchLike
  graphvizCommandPathResolved: string
  graphvizModulePathResolved: string
  ripgrepCommandPathResolved: string
  siteDistDirResolved: string
  showHiddenInTree: boolean
  workspaceDirResolved: string
}

type MutableTreeNode = {
  children: Record<string, MutableTreeNode>
  name: string
  path: string
  type: 'file' | 'directory' | 'slides'
}

const STATIC_FILE_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
])

const EXCLUDED_DIR_NAMES = new Set(['.git', '.venv', 'node_modules'])
const DEFAULT_GRAPHVIZ_COMMAND = 'dot'
const DEFAULT_RIPGREP_COMMAND = 'rg'
const GRAPHVIZ_ENGINES = new Set(['dot'])
const GRAPHVIZ_REQUEST_LIMIT_BYTES = 1024 * 1024
const SLIDES_STATIC_PREFIX = '/slides-static/'
const GRAPHVIZ_THEME_DEFAULTS = {
  dark: {
    edgeColor: '#94a3b8',
    fontColor: '#e2e8f0',
    graphColor: '#94a3b8',
    nodeColor: '#94a3b8',
  },
  light: {
    edgeColor: '#475569',
    fontColor: '#0f172a',
    graphColor: '#475569',
    nodeColor: '#475569',
  },
} as const

let graphvizVizPromise: Promise<Awaited<ReturnType<GraphvizModule['instance']>>> | null = null

class HttpError extends Error {
  statusCode: number

  detail: string

  constructor(statusCode: number, detail: string) {
    super(detail)
    this.detail = detail
    this.statusCode = statusCode
  }
}

export function createHandbookServer(options: HandbookServerOptions): Server {
  const normalized = normalizeOptions(options)

  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, normalized)
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { detail: error.detail }, request.method)
        return
      }

      console.error(error)
      sendJson(response, 500, { detail: 'Internal server error' }, request.method)
    }
  })
}

export async function listMarkdownFiles(
  options: Pick<NormalizedOptions, 'ripgrepCommandPathResolved' | 'showHiddenInTree' | 'workspaceDirResolved'>,
): Promise<string[]> {
  try {
    return await listMarkdownFilesWithRipgrep(options)
  } catch (error) {
    console.warn(`ripgrep markdown scan failed, falling back to fs walk: ${stringifyError(error)}`)
    return await listMarkdownFilesWithFsWalk(options)
  }
}

async function listMarkdownFilesWithRipgrep(
  options: Pick<NormalizedOptions, 'ripgrepCommandPathResolved' | 'showHiddenInTree' | 'workspaceDirResolved'>,
): Promise<string[]> {
  const args = [
    '--files',
    '--glob',
    '*.md',
  ]

  if (options.showHiddenInTree) {
    args.push('--hidden')
  }

  for (const excludedDirName of EXCLUDED_DIR_NAMES) {
    args.push('--glob', `!${excludedDirName}/**`, '--glob', `!**/${excludedDirName}/**`)
  }

  const stdout = await runCommand(options.ripgrepCommandPathResolved, args, options.workspaceDirResolved)
  return stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => toPosixPath(entry))
    .filter((entry) => options.showHiddenInTree || !isHiddenMarkdown(entry))
    .sort((left, right) => left.localeCompare(right))
}

async function listMarkdownFilesWithFsWalk(
  options: Pick<NormalizedOptions, 'showHiddenInTree' | 'workspaceDirResolved'>,
): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(entry.name)) {
          continue
        }
        await walk(absolutePath)
        continue
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') {
        continue
      }

      const relativePath = path.relative(options.workspaceDirResolved, absolutePath)
      const normalizedPath = toPosixPath(relativePath)
      if (!options.showHiddenInTree && isHiddenMarkdown(normalizedPath)) {
        continue
      }
      files.push(normalizedPath)
    }
  }

  await walk(options.workspaceDirResolved)
  files.sort((left, right) => left.localeCompare(right))
  return files
}

export async function collectMarkdownFileMeta(
  workspaceDirResolved: string,
  paths: string[],
): Promise<Record<string, FileMeta>> {
  const fileMeta: Record<string, FileMeta> = {}

  for (const rawPath of paths) {
    const absolutePath = path.join(workspaceDirResolved, rawPath)
    try {
      const [statResult, source] = await Promise.all([
        fs.stat(absolutePath),
        fs.readFile(absolutePath, 'utf8'),
      ])
      fileMeta[rawPath] = {
        bytes: statResult.size,
        kind: 'markdown',
        title: extractMarkdownPrimaryTitle(source, path.basename(rawPath)),
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error
      }
    }
  }

  return fileMeta
}

type SlidesProject = {
  entryRelativePath: string
  id: string
  title: string
}

async function collectWorkspaceFileMeta(
  workspaceDirResolved: string,
  markdownPaths: string[],
  slidesProjects: SlidesProject[],
): Promise<Record<string, FileMeta>> {
  const markdownMeta = await collectMarkdownFileMeta(workspaceDirResolved, markdownPaths)
  const slidesMeta = Object.fromEntries(
    slidesProjects.map((project) => [
      project.id,
      {
        bytes: 0,
        kind: 'slides',
        title: project.title,
      } satisfies FileMeta,
    ]),
  )

  return {
    ...markdownMeta,
    ...slidesMeta,
  }
}

async function listSlidesProjects(workspaceDirResolved: string): Promise<SlidesProject[]> {
  const slidesRoot = path.join(workspaceDirResolved, 'slides')
  if (!(await fileExists(slidesRoot))) {
    return []
  }

  let entries
  try {
    entries = await fs.readdir(slidesRoot, { withFileTypes: true })
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }
    throw error
  }

  const projects: SlidesProject[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue
    }

    const projectDirRelative = toPosixPath(path.join('slides', entry.name))
    const projectDirAbsolute = path.join(workspaceDirResolved, projectDirRelative)
    const distEntry = path.join(projectDirAbsolute, 'dist', 'index.html')
    const rootEntry = path.join(projectDirAbsolute, 'index.html')

    let entryAbsolutePath = ''
    if (await fileExists(distEntry)) {
      entryAbsolutePath = distEntry
    } else if (await fileExists(rootEntry)) {
      entryAbsolutePath = rootEntry
    } else {
      continue
    }

    projects.push({
      entryRelativePath: toPosixPath(path.relative(workspaceDirResolved, entryAbsolutePath)),
      id: projectDirRelative,
      title: entry.name,
    })
  }

  projects.sort((left, right) => left.id.localeCompare(right.id))
  return projects
}

function extractMarkdownPrimaryTitle(source: string, fallbackTitle: string): string {
  const match = source.match(/^\s*#\s+(.+?)\s*$/m)
  if (match?.[1]) {
    return match[1].trim()
  }
  return fallbackTitle
}

export function buildTree(paths: string[]): TreeNode[] {
  const root: Record<string, MutableTreeNode> = {}

  for (const rawPath of paths) {
    const parts = rawPath.split('/')
    let cursor = root

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]
      const isFile = index === parts.length - 1
      const isSlidesLeaf = isFile && rawPath.startsWith('slides/') && path.extname(rawPath) === ''
      const existing = cursor[part]
      const nextNode =
        existing ||
        (cursor[part] = {
          children: {},
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isSlidesLeaf ? 'slides' : isFile ? 'file' : 'directory',
        })

      if (!isFile) {
        cursor = nextNode.children
      }
    }
  }

  return finalizeTree(root)
}

function finalizeTree(nodes: Record<string, MutableTreeNode>): TreeNode[] {
  const items = Object.values(nodes)
  items.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'directory' ? -1 : 1
    }
    return left.name.localeCompare(right.name)
  })

  return items.map((item) => {
    if (item.type === 'directory') {
      return {
        children: finalizeTree(item.children),
        name: item.name,
        path: item.path,
        type: item.type,
      }
    }

    return {
      name: item.name,
      path: item.path,
      type: item.type,
    }
  })
}

function normalizeOptions(options: HandbookServerOptions): NormalizedOptions {
  const appRoot = path.resolve(options.siteDistDir, '..', '..')
  return {
    ...options,
    fetchImpl: options.fetchImpl || fetch,
    siteDistDirResolved: path.resolve(options.siteDistDir),
    graphvizCommandPathResolved: options.graphvizCommandPath || DEFAULT_GRAPHVIZ_COMMAND,
    graphvizModulePathResolved: resolveGraphvizModulePath(
      appRoot,
      options.graphvizModulePath,
    ),
    ripgrepCommandPathResolved: options.ripgrepCommandPath || DEFAULT_RIPGREP_COMMAND,
    showHiddenInTree: Boolean(options.showHiddenInTree),
    workspaceDirResolved: path.resolve(options.workspaceDir),
  }
}

function resolveGraphvizModulePath(appRoot: string, explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath)
  }

  const requireFromApp = createRequire(path.join(appRoot, 'package.json'))
  return requireFromApp.resolve('@viz-js/viz')
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: NormalizedOptions,
): Promise<void> {
  const method = request.method || 'GET'

  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  if (requestUrl.pathname === '/api/render/graphviz') {
    if (method !== 'POST') {
      response.setHeader('Allow', 'POST')
      throw new HttpError(405, 'Method not allowed')
    }
    const payload = await renderGraphviz(await readJsonBody(request), options)
    sendJson(response, 200, payload, method)
    return
  }

  if (!['GET', 'HEAD'].includes(method)) {
    response.setHeader('Allow', 'GET, HEAD')
    throw new HttpError(405, 'Method not allowed')
  }

  if (requestUrl.pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok' }, method)
    return
  }

  if (requestUrl.pathname === '/api/tree') {
    const payload = await loadTreePayload(options)
    sendJson(response, 200, payload, method)
    return
  }

  if (requestUrl.pathname === '/api/document') {
    const payload = await loadDocumentPayload(requestUrl, options)
    sendJson(response, 200, payload, method)
    return
  }

  if (requestUrl.pathname.startsWith(SLIDES_STATIC_PREFIX)) {
    await serveSlidesStatic(requestUrl.pathname, response, method, options)
    return
  }

  if (requestUrl.pathname === '/favicon.svg') {
    const indexFile = await ensureSiteReady(options.siteDistDirResolved)
    const iconFile = path.join(path.dirname(indexFile), 'favicon.svg')
    await sendStaticFile(response, iconFile, method)
    return
  }

  await serveSiteEntry(requestUrl.pathname, response, method, options)
}

async function loadTreePayload(options: NormalizedOptions): Promise<TreeResponse> {
  const markdownFiles = await listMarkdownFiles(options)
  const slidesProjects = await listSlidesProjects(options.workspaceDirResolved)
  const files = [...markdownFiles, ...slidesProjects.map((project) => project.id)].sort((left, right) =>
    left.localeCompare(right),
  )
  return {
    file_meta: await collectWorkspaceFileMeta(options.workspaceDirResolved, markdownFiles, slidesProjects),
    files,
    tree: buildTree(files),
  }
}

async function loadDocumentPayload(
  requestUrl: URL,
  options: NormalizedOptions,
): Promise<DocumentResponse> {
  const pathValue = requestUrl.searchParams.get('path')
  const urlValue = requestUrl.searchParams.get('url')

  if (pathValue && urlValue) {
    throw new HttpError(400, "Use either 'path' or 'url', not both")
  }

  if (urlValue) {
    return loadRemoteMarkdown(urlValue, options.fetchImpl)
  }

  if (pathValue) {
    const slidesProject = await resolveSlidesProject(pathValue, options)
    if (slidesProject) {
      return buildSlidesPayload(slidesProject)
    }
    return loadLocalMarkdown(pathValue, options)
  }

  return {
    active_source: 'home',
    content_type: 'markdown',
    content_markdown: '',
    source_label: options.workspaceDirResolved,
    title: 'handbook',
  }
}

async function resolveSlidesProject(
  pathValue: string,
  options: NormalizedOptions,
): Promise<SlidesProject | null> {
  const normalizedPath = toPosixPath(pathValue).replace(/\/+$/u, '')
  if (!normalizedPath.startsWith('slides/')) {
    return null
  }

  const projects = await listSlidesProjects(options.workspaceDirResolved)
  return projects.find((project) => project.id === normalizedPath) || null
}

async function loadRemoteMarkdown(urlValue: string, fetchImpl: FetchLike): Promise<DocumentResponse> {
  let parsed: URL
  try {
    parsed = new URL(urlValue)
  } catch {
    throw new HttpError(400, 'Only http/https URLs are supported')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpError(400, 'Only http/https URLs are supported')
  }

  let response: Response
  try {
    response = await fetchImpl(urlValue, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    throw new HttpError(502, `Failed to fetch remote markdown: ${stringifyError(error)}`)
  }

  if (!response.ok) {
    throw new HttpError(502, `Failed to fetch remote markdown: ${response.status} ${response.statusText}`.trim())
  }

  const title = path.posix.basename(parsed.pathname) || parsed.hostname
  return buildMarkdownPayload(await response.text(), {
    activeSource: `url:${urlValue}`,
    sourceLabel: urlValue,
    title,
  })
}

async function loadLocalMarkdown(pathValue: string, options: NormalizedOptions): Promise<DocumentResponse> {
  const resolvedPath = await resolveLocalMarkdown(pathValue, options)
  const relativePath = toPosixPath(path.relative(options.workspaceDirResolved, resolvedPath))
  const text = await fs.readFile(resolvedPath, 'utf8')

  return buildMarkdownPayload(text, {
    activeSource: `path:${relativePath}`,
    sourceLabel: relativePath,
    title: path.basename(resolvedPath),
  })
}

async function resolveLocalMarkdown(pathValue: string, options: NormalizedOptions): Promise<string> {
  const candidate = path.resolve(options.workspaceDirResolved, pathValue)

  if (!isWithinRoot(options.workspaceDirResolved, candidate)) {
    throw new HttpError(400, 'Path escapes workspace directory')
  }

  const candidateReadme = path.join(candidate, 'README.md')

  try {
    const statResult = await fs.stat(candidate)
    if (statResult.isDirectory()) {
      const directoryReadmeStat = await fs.stat(candidateReadme)
      if (!directoryReadmeStat.isFile()) {
        throw new HttpError(404, 'Markdown file not found')
      }
      return finalizeMarkdownCandidate(candidateReadme, options)
    }
    if (!statResult.isFile()) {
      throw new HttpError(404, 'Markdown file not found')
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    if (isMissingFileError(error)) {
      throw new HttpError(404, 'Markdown file not found')
    }
    throw error
  }

  return finalizeMarkdownCandidate(candidate, options)
}

function finalizeMarkdownCandidate(candidate: string, options: NormalizedOptions): string {
  if (path.extname(candidate).toLowerCase() !== '.md') {
    throw new HttpError(400, 'Only .md files are supported')
  }

  const relativePath = toPosixPath(path.relative(options.workspaceDirResolved, candidate))
  if (!options.showHiddenInTree && isHiddenMarkdown(relativePath)) {
    throw new HttpError(404, 'Markdown file not found')
  }

  return candidate
}

async function serveSiteEntry(
  pathname: string,
  response: ServerResponse,
  method: string,
  options: NormalizedOptions,
): Promise<void> {
  const indexFile = await ensureSiteReady(options.siteDistDirResolved)
  const normalizedPathname = decodePathname(pathname)

  if (normalizedPathname !== '/') {
    const relativeFilePath = normalizedPathname.replace(/^\/+/, '')
    const candidate = path.resolve(options.siteDistDirResolved, relativeFilePath)
    if (!isWithinRoot(options.siteDistDirResolved, candidate)) {
      throw new HttpError(400, 'Invalid asset path')
    }

    if (await fileExists(candidate)) {
      await sendStaticFile(response, candidate, method)
      return
    }
  }

  await sendStaticFile(response, indexFile, method)
}

async function serveSlidesStatic(
  pathname: string,
  response: ServerResponse,
  method: string,
  options: NormalizedOptions,
): Promise<void> {
  const relativeFilePath = decodePathname(pathname.slice(SLIDES_STATIC_PREFIX.length))
  if (!relativeFilePath) {
    throw new HttpError(404, 'Slides asset not found')
  }

  const slidesRoot = path.join(options.workspaceDirResolved, 'slides')
  const candidate = await resolveSlidesStaticPath(relativeFilePath, options.workspaceDirResolved)
  if (!isWithinRoot(slidesRoot, candidate)) {
    throw new HttpError(400, 'Invalid slides asset path')
  }

  await sendStaticFile(response, candidate, method)
}

async function resolveSlidesStaticPath(relativeFilePath: string, workspaceDirResolved: string): Promise<string> {
  const slidesRoot = path.join(workspaceDirResolved, 'slides')
  const normalizedPath = toPosixPath(relativeFilePath).replace(/^\/+/u, '')
  const rootEntryMatch = normalizedPath.match(/^([^/]+)\/index\.html$/u)

  if (rootEntryMatch) {
    const distEntry = path.join(slidesRoot, rootEntryMatch[1], 'dist', 'index.html')
    if (await fileExists(distEntry)) {
      return distEntry
    }
  }

  const rootAssetMatch = normalizedPath.match(/^([^/]+)\/assets\/(.+)$/u)
  if (rootAssetMatch) {
    const distAsset = path.join(slidesRoot, rootAssetMatch[1], 'dist', 'assets', rootAssetMatch[2])
    if (await fileExists(distAsset)) {
      return distAsset
    }
  }

  return path.resolve(slidesRoot, normalizedPath)
}

async function ensureSiteReady(siteDistDirResolved: string): Promise<string> {
  const indexFile = path.join(siteDistDirResolved, 'index.html')
  if (!(await fileExists(indexFile))) {
    throw new HttpError(503, 'Site build artifacts are missing. Run npm run build first.')
  }
  return indexFile
}

async function sendStaticFile(response: ServerResponse, filePath: string, method: string): Promise<void> {
  let statResult
  try {
    statResult = await fs.stat(filePath)
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new HttpError(404, `${path.basename(filePath)} not found`)
    }
    throw error
  }

  if (!statResult.isFile()) {
    throw new HttpError(404, `${path.basename(filePath)} not found`)
  }

  response.statusCode = 200
  response.setHeader('Content-Length', statResult.size)
  response.setHeader('Content-Type', detectContentType(filePath))

  if (method === 'HEAD') {
    response.end()
    return
  }

  response.end(await fs.readFile(filePath))
}

function buildMarkdownPayload(
  text: string,
  options: {
    activeSource: string
    sourceLabel: string
    title: string
  },
): MarkdownPayload {
  return {
    active_source: options.activeSource,
    content_type: 'markdown',
    content_markdown: text,
    source_label: options.sourceLabel,
    title: options.title,
  }
}

function buildSlidesPayload(project: SlidesProject): MarkdownPayload {
  return {
    active_source: `slides:${project.id}`,
    content_markdown: '',
    content_type: 'slides',
    slides_url: `${SLIDES_STATIC_PREFIX}${project.entryRelativePath.replace(/^slides\//u, '')}`,
    source_label: project.id,
    title: project.title,
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown, method: string | undefined): void {
  const body = JSON.stringify(payload)
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Content-Length', Buffer.byteLength(body))
  if (method === 'HEAD') {
    response.end()
    return
  }
  response.end(body)
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > GRAPHVIZ_REQUEST_LIMIT_BYTES) {
      throw new HttpError(413, 'Request body is too large')
    }
    chunks.push(buffer)
  }

  if (chunks.length === 0) {
    throw new HttpError(400, 'Request body is required')
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON')
  }
}

async function renderGraphviz(body: unknown, options: NormalizedOptions): Promise<{ svg: string }> {
  const { engine, source, themeMode } = parseGraphvizRenderOptions(body)
  const themedSource = applyGraphvizThemeDefaults(source, themeMode)
  const nativeSvg = await renderGraphvizWithNativeDot({ engine, source: themedSource, themeMode }, options.graphvizCommandPathResolved)
  if (nativeSvg) {
    return { svg: namespaceSvgIds(nativeSvg) }
  }

  const viz = await getGraphvizViz(options.graphvizModulePathResolved)
  const svg = viz.renderString(themedSource, { engine, format: 'svg' })
  const json = viz.renderJSON(themedSource, { engine })

  return {
    svg: injectGraphvizTextLengths(svg, collectGraphvizTextOps(json)),
  }
}

async function renderGraphvizWithNativeDot(
  { engine, source }: GraphvizRenderOptions,
  graphvizCommandPathResolved: string,
): Promise<string | null> {
  try {
    const stdout = await runNativeGraphviz(graphvizCommandPathResolved, ['-K' + engine, '-Tsvg:cairo'], source)

    if (typeof stdout === 'string' && stdout.includes('<svg')) {
      return stdout
    }
  } catch (error) {
    console.warn(`Native Graphviz render failed, falling back to viz.js: ${stringifyError(error)}`)
  }

  return null
}

async function runNativeGraphviz(
  graphvizCommandPathResolved: string,
  args: string[],
  input: string,
): Promise<string> {
  return await runCommand(graphvizCommandPathResolved, args, undefined, input)
}

async function runCommand(
  commandPath: string,
  args: string[],
  cwd?: string,
  input?: string,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(commandPath, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk) => {
      stdout += chunk
      if (stdout.length > 8 * 1024 * 1024) {
        child.kill('SIGKILL')
        reject(new Error('Graphviz stdout exceeded limit'))
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || `${commandPath} exited with code ${code ?? 'unknown'}`))
    })

    child.stdin.end(input || '')
  })
}

function namespaceSvgIds(svg: string): string {
  const seenIds = new Map<string, string>()
  const prefix = `gv-${randomUUID().replaceAll('-', '')}`

  let namespacedSvg = svg.replace(/\bid="([^"]+)"/gu, (match, id) => {
    const nextId = `${prefix}-${id}`
    seenIds.set(id, nextId)
    return match.replace(`"${id}"`, `"${nextId}"`)
  })

  if (seenIds.size === 0) {
    return namespacedSvg
  }

  for (const [originalId, nextId] of seenIds) {
    namespacedSvg = namespacedSvg
      .replaceAll(`xlink:href="#${originalId}"`, `xlink:href="#${nextId}"`)
      .replaceAll(`href="#${originalId}"`, `href="#${nextId}"`)
      .replaceAll(`url(#${originalId})`, `url(#${nextId})`)
  }

  return namespacedSvg
}

function parseGraphvizRenderOptions(body: unknown): GraphvizRenderOptions {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'Graphviz render request must be a JSON object')
  }

  const engine = typeof body.engine === 'string' && body.engine.trim() ? body.engine.trim() : 'dot'
  const source = typeof body.source === 'string' ? body.source.trim() : ''
  const themeMode = body.themeMode === 'light' ? 'light' : 'dark'

  if (!GRAPHVIZ_ENGINES.has(engine)) {
    throw new HttpError(400, `Unsupported Graphviz engine: ${engine}`)
  }

  if (!source) {
    throw new HttpError(400, 'Graphviz source is required')
  }

  return { engine, source, themeMode }
}

function applyGraphvizThemeDefaults(source: string, themeMode: 'dark' | 'light'): string {
  const graphBodyIndex = source.indexOf('{')
  if (graphBodyIndex === -1) {
    return source
  }

  const palette = GRAPHVIZ_THEME_DEFAULTS[themeMode]
  const defaultBlock = [
    `graph [bgcolor="transparent", color="${palette.graphColor}", fontcolor="${palette.fontColor}"];`,
    `node [color="${palette.nodeColor}", fontcolor="${palette.fontColor}"];`,
    `edge [color="${palette.edgeColor}", fontcolor="${palette.fontColor}"];`,
  ].join('\n')

  return `${source.slice(0, graphBodyIndex + 1)}\n${defaultBlock}\n${source.slice(graphBodyIndex + 1)}`
}

async function getGraphvizViz(graphvizModulePathResolved: string): Promise<Awaited<ReturnType<GraphvizModule['instance']>>> {
  if (!graphvizVizPromise) {
    graphvizVizPromise = import(pathToFileURL(graphvizModulePathResolved).href)
      .then((module) => module.instance())
      .catch((error) => {
        graphvizVizPromise = null
        throw new HttpError(503, `Graphviz renderer is unavailable: ${stringifyError(error)}`)
      })
  }

  return graphvizVizPromise
}

function collectGraphvizTextOps(value: unknown): GraphvizTextOp[] {
  const operations: GraphvizTextOp[] = []

  function visit(node: unknown): void {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item)
      }
      return
    }

    const record = node as Record<string, unknown>
    const drawOperations = record._ldraw_
    if (Array.isArray(drawOperations)) {
      for (const operation of drawOperations) {
        if (
          operation &&
          typeof operation === 'object' &&
          (operation as Record<string, unknown>).op === 'T' &&
          typeof (operation as Record<string, unknown>).text === 'string' &&
          typeof (operation as Record<string, unknown>).width === 'number'
        ) {
          operations.push({
            text: (operation as Record<string, unknown>).text as string,
            width: (operation as Record<string, unknown>).width as number,
          })
        }
      }
    }

    for (const key of ['objects', 'edges', 'subgraphs']) {
      visit(record[key])
    }
  }

  visit(value)
  return operations
}

function injectGraphvizTextLengths(svg: string, textOps: GraphvizTextOp[]): string {
  if (textOps.length === 0) {
    return svg
  }

  let textIndex = 0
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gu, (match, attributes, textContent) => {
    const textOp = textOps[textIndex]
    if (!textOp) {
      return match
    }

    const normalizedTextContent = decodeXmlEntities(stripTags(textContent)).replace(/\s+/gu, ' ').trim()
    if (normalizedTextContent !== textOp.text.replace(/\s+/gu, ' ').trim()) {
      const fallbackOp = textOps.find((candidate, index) => {
        if (index < textIndex) {
          return false
        }
        return candidate.text.replace(/\s+/gu, ' ').trim() === normalizedTextContent
      })

      if (!fallbackOp) {
        return match
      }

      textIndex = textOps.indexOf(fallbackOp) + 1
      return appendTextLength(match, fallbackOp.width)
    }

    textIndex += 1
    return appendTextLength(match, textOp.width)
  })
}

function appendTextLength(textNode: string, width: number): string {
  const normalizedWidth = Number(width.toFixed(3))
  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) {
    return textNode
  }

  return textNode.replace(
    /<text\b/iu,
    `<text textLength="${normalizedWidth}" lengthAdjust="spacingAndGlyphs"`,
  )
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/gu, '')
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function detectContentType(filePath: string): string {
  return STATIC_FILE_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream'
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    throw new HttpError(400, 'Invalid asset path')
  }
}

function isHiddenMarkdown(relativePath: string): boolean {
  return relativePath.split('/').some((segment) => segment.startsWith('.'))
}

function isWithinRoot(rootDir: string, candidate: string): boolean {
  const relative = path.relative(rootDir, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}
