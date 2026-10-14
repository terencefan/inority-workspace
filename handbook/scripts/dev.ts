import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

type ManagedProcess = {
  command: string
  label: string
  process: ChildProcess
}

const children: ManagedProcess[] = []
let shuttingDown = false

function spawnManagedProcess(
  label: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): ManagedProcess {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: 'inherit',
  })

  const managed = { command, label, process: child }
  children.push(managed)

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    console.error(`${label} exited with ${signal ? `signal ${signal}` : `code ${code ?? 0}`}`)
    shutdown(1)
  })

  return managed
}

function shutdown(exitCode = 0): void {
  shuttingDown = true

  for (const child of children) {
    if (!child.process.killed) {
      child.process.kill('SIGTERM')
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.process.killed) {
        child.process.kill('SIGKILL')
      }
    }
    process.exit(exitCode)
  }, 250).unref()
}

spawnManagedProcess('node', 'node', ['--watch', 'src/index.ts'], ROOT_DIR)
spawnManagedProcess('site', 'vite', ['--config', 'vite.config.ts', '--host', '0.0.0.0'], ROOT_DIR)

// `node --watch` only restarts the backend on source file changes, so a
// backend that dies outside a source edit (e.g. host `npm ci` mutating
// node_modules under a bind-mounted workspace) stays dead forever. Probe
// health and restart the whole stack via a non-zero exit once a backend
// that was healthy goes down.
const BACKEND_HEALTH_URL = `http://127.0.0.1:${process.env.HANDBOOK_PORT || '18080'}/healthz`
const HEALTH_PROBE_INTERVAL_MS = 15_000
const HEALTH_PROBE_TIMEOUT_MS = 3_000
const HEALTH_PROBE_FAILURE_THRESHOLD = 3

let backendSeenHealthy = false
let consecutiveHealthFailures = 0

async function probeBackendHealth(): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(BACKEND_HEALTH_URL, { signal: controller.signal, cache: 'no-store' })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

const healthProbeTimer = setInterval(() => {
  void probeBackendHealth().then((healthy) => {
    if (healthy) {
      backendSeenHealthy = true
      consecutiveHealthFailures = 0
      return
    }
    if (!backendSeenHealthy) {
      return
    }
    consecutiveHealthFailures += 1
    console.error(
      `backend health probe failed (${consecutiveHealthFailures}/${HEALTH_PROBE_FAILURE_THRESHOLD})`,
    )
    if (consecutiveHealthFailures >= HEALTH_PROBE_FAILURE_THRESHOLD) {
      console.error('restarting dev stack after sustained backend health failure')
      shutdown(1)
    }
  })
}, HEALTH_PROBE_INTERVAL_MS)
healthProbeTimer.unref()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => shutdown(0))
}
