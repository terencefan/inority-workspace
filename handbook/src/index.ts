import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'

import { createHandbookServer } from './handbook-http.ts'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SRC_DIR, '..')
const REQUIRE_FROM_APP = createRequire(path.join(APP_DIR, 'package.json'))
const DEFAULT_GRAPHVIZ_COMMAND_PATH = process.env.HANDBOOK_GRAPHVIZ_COMMAND || 'dot'
const DEFAULT_SITE_DIST_DIR = path.join(APP_DIR, 'src', 'dist')
const DEFAULT_GRAPHVIZ_MODULE_PATH = REQUIRE_FROM_APP.resolve('@viz-js/viz')
const DEFAULT_RIPGREP_COMMAND_PATH = process.env.HANDBOOK_RG_COMMAND || 'rg'
const DEFAULT_WORKSPACE_DIR = path.resolve(APP_DIR, '..')
const DEFAULT_HOME_LINKS_FILE = path.join(APP_DIR, 'src', 'home-links.json')
const DEFAULT_VITE_CONFIG_FILE = path.join(APP_DIR, 'vite.config.ts')

const host = process.env.HANDBOOK_HOST || '0.0.0.0'
const port = Number(process.env.HANDBOOK_PORT || '18080')
const enableViteDev = ['1', 'on', 'true', 'yes'].includes(
  (process.env.HANDBOOK_ENABLE_VITE_DEV || '').toLowerCase(),
)
const showHiddenInTree = ['1', 'on', 'true', 'yes'].includes(
  (process.env.HANDBOOK_SHOW_HIDDEN || '').toLowerCase(),
)
const siteDistDir =
  process.env.HANDBOOK_SITE_DIST_DIR || process.env.HANDBOOK_FRONTEND_DIST_DIR || DEFAULT_SITE_DIST_DIR

let viteSiteRequestHandler: ((request: IncomingMessage, response: ServerResponse) => Promise<void>) | undefined

const server = createHandbookServer({
  graphvizCommandPath: DEFAULT_GRAPHVIZ_COMMAND_PATH,
  graphvizModulePath: process.env.HANDBOOK_GRAPHVIZ_MODULE_PATH || DEFAULT_GRAPHVIZ_MODULE_PATH,
  homeLinksFile: process.env.HANDBOOK_HOME_LINKS_FILE || DEFAULT_HOME_LINKS_FILE,
  ripgrepCommandPath: DEFAULT_RIPGREP_COMMAND_PATH,
  siteRequestHandler: enableViteDev
    ? async (request, response) => {
        if (!viteSiteRequestHandler) {
          throw new Error('vite site request handler is not initialized')
        }
        await viteSiteRequestHandler(request, response)
      }
    : undefined,
  siteDistDir,
  showHiddenInTree,
  workspaceDir: process.env.HANDBOOK_WORKSPACE_DIR || DEFAULT_WORKSPACE_DIR,
})

async function start(): Promise<void> {
  let viteServer: ViteDevServer | null = null

  if (enableViteDev) {
    const { createServer: createViteServer } = await import('vite')
    viteServer = await createViteServer({
      appType: 'spa',
      configFile: DEFAULT_VITE_CONFIG_FILE,
      server: {
        hmr: {
          server,
        },
        middlewareMode: true,
      },
    })
    viteSiteRequestHandler = async (request, response) => {
      await new Promise<void>((resolve, reject) => {
        viteServer!.middlewares(request, response, (error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    }
  }

  server.on('error', (error) => {
    console.error(error)
    process.exitCode = 1
  })

  server.listen(port, host, () => {
    const modeLabel = enableViteDev ? 'vite-dev' : 'static-dist'
    console.log(`handbook server listening on http://${host}:${port} (${modeLabel})`)
  })

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(async (error) => {
        if (viteServer) {
          await viteServer.close()
        }
        if (error) {
          console.error(error)
          process.exitCode = 1
        }
        process.exit()
      })
    })
  }
}

start().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
