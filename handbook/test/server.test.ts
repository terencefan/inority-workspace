import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createHandbookServer } from '../src/handbook-http.ts'

type TestServer = {
  baseUrl: string
}

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(TEST_DIR, '..')
const REQUIRE_FROM_APP = createRequire(path.join(APP_ROOT, 'package.json'))
const GRAPHVIZ_COMMAND_PATH = 'dot'
const GRAPHVIZ_MODULE_PATH = REQUIRE_FROM_APP.resolve('@viz-js/viz')

async function createFixtureRoot(): Promise<{
  siteDistDir: string
  workspaceDir: string
}> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'handbook-server-'))
  const workspaceDir = path.join(rootDir, 'workspace')
  const siteDistDir = path.join(workspaceDir, 'handbook', 'src', 'dist')

  await mkdir(path.join(workspaceDir, 'project'), { recursive: true })
  await mkdir(path.join(workspaceDir, '.hidden'), { recursive: true })
  await mkdir(path.join(workspaceDir, '.git', 'docs'), { recursive: true })
  await mkdir(path.join(workspaceDir, 'node_modules', 'pkg'), { recursive: true })
  await mkdir(path.join(workspaceDir, '.venv', 'docs'), { recursive: true })
  await mkdir(path.join(workspaceDir, 'slides', 'demo-basic'), { recursive: true })
  await mkdir(path.join(workspaceDir, 'slides', 'brand-fancy', 'dist', 'assets'), { recursive: true })
  await mkdir(path.join(siteDistDir, 'assets'), { recursive: true })

  await writeFile(path.join(workspaceDir, 'project', 'README.md'), '# Visible\n')
  await writeFile(path.join(workspaceDir, '.hidden', 'README.md'), '# Hidden\n')
  await writeFile(path.join(workspaceDir, '.git', 'docs', 'ignored.md'), '# Git ignored\n')
  await writeFile(path.join(workspaceDir, 'node_modules', 'pkg', 'ignored.md'), '# Module ignored\n')
  await writeFile(path.join(workspaceDir, '.venv', 'docs', 'ignored.md'), '# Venv ignored\n')
  await writeFile(
    path.join(workspaceDir, 'slides', 'demo-basic', 'index.html'),
    '<!doctype html><html><body>slides demo</body></html>',
  )
  await writeFile(path.join(workspaceDir, 'slides', 'demo-basic', 'main.js'), 'console.log("slides");')
  await writeFile(
    path.join(workspaceDir, 'slides', 'brand-fancy', 'index.html'),
    '<!doctype html><html><body>slides source</body></html>',
  )
  await writeFile(
    path.join(workspaceDir, 'slides', 'brand-fancy', 'dist', 'index.html'),
    '<!doctype html><html><body>slides built</body></html>',
  )
  await writeFile(
    path.join(workspaceDir, 'slides', 'brand-fancy', 'dist', 'assets', 'main.js'),
    'console.log("brand-built");',
  )
  await writeFile(path.join(workspaceDir, '.gitignore'), '.venv/\nnode_modules/\n')
  await writeFile(path.join(workspaceDir, 'notes.txt'), 'ignore me\n')
  await writeFile(path.join(siteDistDir, 'index.html'), '<!doctype html><html><body>handbook</body></html>')
  await writeFile(path.join(siteDistDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  await writeFile(path.join(siteDistDir, 'assets', 'main.js'), 'console.log("handbook");')

  return { siteDistDir, workspaceDir }
}

async function startServer(
  t: test.TestContext,
  options?: Partial<Parameters<typeof createHandbookServer>[0]>,
): Promise<TestServer | null> {
  const fixture = await createFixtureRoot()
  const server = createHandbookServer({
    ...fixture,
    fetchImpl: async (input) =>
      new Response(`# Remote ${String(input)}`, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
        status: 200,
      }),
    graphvizCommandPath: GRAPHVIZ_COMMAND_PATH,
    graphvizModulePath: GRAPHVIZ_MODULE_PATH,
    ...options,
  })

  const listenResult = await new Promise<'listening' | 'skipped'>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.removeListener('listening', onListening)
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip(`local listen is not permitted in current environment: ${error.code}`)
        resolve('skipped')
        return
      }
      reject(error)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve('listening')
    }

    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(0, '127.0.0.1')
  })

  if (listenResult === 'skipped') {
    return null
  }

  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected an IPv4 test server address')
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
  }
}

test('tree payload excludes hidden markdown by default and includes file metadata', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }
  const response = await fetch(`${server.baseUrl}/api/tree`)

  assert.equal(response.status, 200)
  const payload = await response.json()

  assert.deepEqual(payload.files, ['project/README.md', 'slides/brand-fancy', 'slides/demo-basic'])
  assert.equal(payload.file_meta['project/README.md'].bytes, Buffer.byteLength('# Visible\n'))
  assert.equal(payload.file_meta['project/README.md'].title, 'Visible')
  assert.equal(payload.file_meta['slides/brand-fancy'].kind, 'slides')
  assert.equal(payload.file_meta['slides/brand-fancy'].title, 'brand-fancy')
  assert.equal(payload.file_meta['slides/demo-basic'].kind, 'slides')
  assert.equal(payload.file_meta['slides/demo-basic'].title, 'demo-basic')
  assert.deepEqual(payload.tree, [
    {
      children: [
        {
          name: 'README.md',
          path: 'project/README.md',
          type: 'file',
        },
      ],
      name: 'project',
      path: 'project',
      type: 'directory',
    },
    {
      children: [
        {
          name: 'brand-fancy',
          path: 'slides/brand-fancy',
          type: 'slides',
        },
        {
          name: 'demo-basic',
          path: 'slides/demo-basic',
          type: 'slides',
        },
      ],
      name: 'slides',
      path: 'slides',
      type: 'directory',
    },
  ])
})

test('tree payload can include hidden markdown while still excluding internal cache directories', async (t) => {
  const server = await startServer(t, { showHiddenInTree: true })
  if (!server) {
    return
  }
  const response = await fetch(`${server.baseUrl}/api/tree`)

  assert.equal(response.status, 200)
  const payload = await response.json()

  assert.deepEqual(payload.files, ['.hidden/README.md', 'project/README.md', 'slides/brand-fancy', 'slides/demo-basic'])
  assert.equal(payload.file_meta['.hidden/README.md'].title, 'Hidden')
  assert.deepEqual(payload.tree, [
    {
      children: [
        {
          name: 'README.md',
          path: '.hidden/README.md',
          type: 'file',
        },
      ],
      name: '.hidden',
      path: '.hidden',
      type: 'directory',
    },
    {
      children: [
        {
          name: 'README.md',
          path: 'project/README.md',
          type: 'file',
        },
      ],
      name: 'project',
      path: 'project',
      type: 'directory',
    },
    {
      children: [
        {
          name: 'brand-fancy',
          path: 'slides/brand-fancy',
          type: 'slides',
        },
        {
          name: 'demo-basic',
          path: 'slides/demo-basic',
          type: 'slides',
        },
      ],
      name: 'slides',
      path: 'slides',
      type: 'directory',
    },
  ])
})

test('document endpoint serves local and remote markdown payloads', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }

  const localResponse = await fetch(`${server.baseUrl}/api/document?path=project%2FREADME.md`)
  assert.equal(localResponse.status, 200)
  assert.deepEqual(await localResponse.json(), {
    active_source: 'path:project/README.md',
    content_markdown: '# Visible\n',
    content_type: 'markdown',
    source_label: 'project/README.md',
    title: 'README.md',
  })

  const remoteResponse = await fetch(`${server.baseUrl}/api/document?url=https%3A%2F%2Fexample.com%2Fguide.md`)
  assert.equal(remoteResponse.status, 200)
  assert.deepEqual(await remoteResponse.json(), {
    active_source: 'url:https://example.com/guide.md',
    content_markdown: '# Remote https://example.com/guide.md',
    content_type: 'markdown',
    source_label: 'https://example.com/guide.md',
    title: 'guide.md',
  })
})

test('document endpoint serves slides payloads', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }

  const demoResponse = await fetch(`${server.baseUrl}/api/document?path=slides%2Fdemo-basic`)
  assert.equal(demoResponse.status, 200)
  assert.deepEqual(await demoResponse.json(), {
    active_source: 'slides:slides/demo-basic',
    content_markdown: '',
    content_type: 'slides',
    slides_url: '/slides-static/demo-basic/index.html',
    source_label: 'slides/demo-basic',
    title: 'demo-basic',
  })

  const brandResponse = await fetch(`${server.baseUrl}/api/document?path=slides%2Fbrand-fancy`)
  assert.equal(brandResponse.status, 200)
  assert.deepEqual(await brandResponse.json(), {
    active_source: 'slides:slides/brand-fancy',
    content_markdown: '',
    content_type: 'slides',
    slides_url: '/slides-static/brand-fancy/dist/index.html',
    source_label: 'slides/brand-fancy',
    title: 'brand-fancy',
  })
})

test('document endpoint reports invalid local and remote inputs cleanly', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }

  const missingResponse = await fetch(`${server.baseUrl}/api/document?path=missing.md`)
  assert.equal(missingResponse.status, 404)
  assert.deepEqual(await missingResponse.json(), { detail: 'Markdown file not found' })

  const invalidUrlResponse = await fetch(`${server.baseUrl}/api/document?url=file%3A%2F%2Ftmp%2Fdoc.md`)
  assert.equal(invalidUrlResponse.status, 400)
  assert.deepEqual(await invalidUrlResponse.json(), { detail: 'Only http/https URLs are supported' })
})

test('site assets are served directly and app routes fall back to index.html', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }

  const assetResponse = await fetch(`${server.baseUrl}/assets/main.js`)
  assert.equal(assetResponse.status, 200)
  assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/)
  assert.equal(await assetResponse.text(), 'console.log("handbook");')

  const routeResponse = await fetch(`${server.baseUrl}/project`)
  assert.equal(routeResponse.status, 200)
  assert.match(routeResponse.headers.get('content-type') || '', /text\/html/)
  assert.match(await routeResponse.text(), /handbook/)
})

test('slides assets are served from workspace slides projects', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }

  const assetResponse = await fetch(`${server.baseUrl}/slides-static/demo-basic/main.js`)
  assert.equal(assetResponse.status, 200)
  assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/)
  assert.equal(await assetResponse.text(), 'console.log("slides");')

  const rootSlidesResponse = await fetch(`${server.baseUrl}/slides-static/brand-fancy/index.html`)
  assert.equal(rootSlidesResponse.status, 200)
  assert.match(rootSlidesResponse.headers.get('content-type') || '', /text\/html/)
  assert.match(await rootSlidesResponse.text(), /slides built/)

  const rootAssetAliasResponse = await fetch(`${server.baseUrl}/slides-static/brand-fancy/assets/main.js`)
  assert.equal(rootAssetAliasResponse.status, 200)
  assert.match(rootAssetAliasResponse.headers.get('content-type') || '', /application\/javascript/)
  assert.equal(await rootAssetAliasResponse.text(), 'console.log("brand-built");')

  const distAssetResponse = await fetch(`${server.baseUrl}/slides-static/brand-fancy/dist/assets/main.js`)
  assert.equal(distAssetResponse.status, 200)
  assert.match(distAssetResponse.headers.get('content-type') || '', /application\/javascript/)
  assert.equal(await distAssetResponse.text(), 'console.log("brand-built");')
})

test('graphviz render endpoint injects textLength into server-rendered SVG', async (t) => {
  const server = await startServer(t)
  if (!server) {
    return
  }
  const response = await fetch(`${server.baseUrl}/api/render/graphviz`, {
    body: JSON.stringify({
      engine: 'dot',
      source:
        'digraph{graph[fontname="Noto Sans CJK SC"];node[shape=box style="rounded,filled" fontname="Noto Sans CJK SC" fontsize=11]; a[label="共享 100GiB base image"]; }',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.match(payload.svg, /<svg\b/)
  assert.match(payload.svg, /gv-[a-f0-9]+-glyph-0-0|共享 100GiB base image|<defs>/)
  assert.doesNotMatch(payload.svg, /id="glyph-0-0"/)
  assert.doesNotMatch(payload.svg, /xlink:href="#glyph-0-0"/)
})

test('graphviz render endpoint falls back to viz.js text fitting when native dot is unavailable', async (t) => {
  const server = await startServer(t, { graphvizCommandPath: '/nonexistent-dot-binary' })
  if (!server) {
    return
  }
  const response = await fetch(`${server.baseUrl}/api/render/graphviz`, {
    body: JSON.stringify({
      engine: 'dot',
      source:
        'digraph{graph[fontname="Noto Sans CJK SC"];node[shape=box style="rounded,filled" fontname="Noto Sans CJK SC" fontsize=11]; a[label="共享 100GiB base image"]; }',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.match(payload.svg, /textLength="/)
  assert.match(payload.svg, /lengthAdjust="spacingAndGlyphs"/)
})
