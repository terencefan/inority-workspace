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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => shutdown(0))
}
