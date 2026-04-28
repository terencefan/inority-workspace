import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = process.env.HANDBOOK_DEV_BACKEND || 'http://127.0.0.1:18080'
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src')

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
    proxy: {
      '/api': backendTarget,
      '/assets': backendTarget,
      '/favicon.svg': backendTarget,
    },
  },
})
