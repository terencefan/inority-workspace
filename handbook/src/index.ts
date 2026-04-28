import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { createHandbookServer } from './handbook-http.ts'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SRC_DIR, '..')
const REQUIRE_FROM_APP = createRequire(path.join(APP_DIR, 'package.json'))
const DEFAULT_GRAPHVIZ_COMMAND_PATH = process.env.HANDBOOK_GRAPHVIZ_COMMAND || 'dot'
const DEFAULT_SITE_DIST_DIR = path.join(APP_DIR, 'src', 'dist')
const DEFAULT_GRAPHVIZ_MODULE_PATH = REQUIRE_FROM_APP.resolve('@viz-js/viz')
const DEFAULT_RIPGREP_COMMAND_PATH = process.env.HANDBOOK_RG_COMMAND || 'rg'
const DEFAULT_WORKSPACE_DIR = path.resolve(APP_DIR, '..')

const host = process.env.HANDBOOK_HOST || '0.0.0.0'
const port = Number(process.env.HANDBOOK_PORT || '18080')
const showHiddenInTree = ['1', 'on', 'true', 'yes'].includes(
  (process.env.HANDBOOK_SHOW_HIDDEN || '').toLowerCase(),
)
const siteDistDir =
  process.env.HANDBOOK_SITE_DIST_DIR || process.env.HANDBOOK_FRONTEND_DIST_DIR || DEFAULT_SITE_DIST_DIR

const server = createHandbookServer({
  graphvizCommandPath: DEFAULT_GRAPHVIZ_COMMAND_PATH,
  graphvizModulePath: process.env.HANDBOOK_GRAPHVIZ_MODULE_PATH || DEFAULT_GRAPHVIZ_MODULE_PATH,
  ripgrepCommandPath: DEFAULT_RIPGREP_COMMAND_PATH,
  siteDistDir,
  showHiddenInTree,
  workspaceDir: process.env.HANDBOOK_WORKSPACE_DIR || DEFAULT_WORKSPACE_DIR,
})

server.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

server.listen(port, host, () => {
  console.log(`handbook server listening on http://${host}:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close((error) => {
      if (error) {
        console.error(error)
        process.exitCode = 1
      }
      process.exit()
    })
  })
}
