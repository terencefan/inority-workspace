import { defineConfig } from 'vite'

export default defineConfig({
  // Use relative asset paths so the built deck can be embedded under
  // handbook's /slides-static/<project>/dist/ route.
  base: './',
})
