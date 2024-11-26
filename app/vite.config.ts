// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // 是否应该添加到生产环境
      protocolImports: true,
    }),
  ],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    'process.env': {},
    'global': {},
  }
})