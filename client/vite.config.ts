import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api requests to the Express backend so the browser only
    // ever talks to one origin during development.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
