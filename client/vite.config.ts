import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api requests to the Express backend so the browser only
    // ever talks to one origin during development.
    // Backend port (default 3000; override with BACKEND_PORT for local conflicts).
    proxy: {
      '/api': `http://localhost:${process.env.BACKEND_PORT ?? 3000}`,
    },
  },
})
