
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 3000,
    strictPort: true,

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
    sourcemap: false,
    reportCompressedSize: false,
  },
})

