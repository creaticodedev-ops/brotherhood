
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))

const apiPort = () => {
  try {
    const match = readFileSync(path.resolve(root, '../server/.env'), 'utf8').match(/^PORT=(\d+)/m)
    if (match) return match[1]
  } catch {
    /* server/.env is optional */
  }
  return process.env.PORT || '5000'
}

const API_TARGET = `http://127.0.0.1:${apiPort()}`

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 3000,
    strictPort: true,
    fs: { allow: [root, path.resolve(root, '..')] },

    allowedHosts: [
      'borough-learners-ampland-cet.trycloudflare.com',
    ],

    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 3000,
  },

  build: {
    target: 'es2020',
    // Named browsers (not just a language level) so esbuild adds -webkit- prefixes for older Safari and Chrome.
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14', 'ios14'],
    sourcemap: false,
    reportCompressedSize: false,
  },
})

