import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = process.env.HANDBOOK_DEV_BACKEND || 'http://127.0.0.1:18080'
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src')
const defaultAllowedHosts = ['handbook.data.pjlab.tefa']
const allowedHosts = Array.from(
  new Set(
    [
      ...defaultAllowedHosts,
      ...(process.env.HANDBOOK_DEV_ALLOWED_HOSTS || '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean),
    ],
  ),
)

function formatBuildVersion(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const valueByType = new Map(parts.map((part) => [part.type, part.value]))
  return `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')} ${valueByType.get('weekday')} ${valueByType.get('hour')}:${valueByType.get('minute')}:${valueByType.get('second')}`
}

const buildVersion = process.env.VITE_BUILD_VERSION || formatBuildVersion()

process.env.VITE_BUILD_VERSION = buildVersion

export default defineConfig({
  root: APP_DIR,
  plugins: [react()],
  base: '/',
  publicDir: path.join(APP_DIR, 'public'),
  build: {
    outDir: path.join(APP_DIR, 'dist'),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts,
    proxy: {
      '/api': backendTarget,
      '/assets': backendTarget,
      '/favicon.svg': backendTarget,
    },
  },
})
