// vite.config.ts
import { defineConfig } from 'vite'
import honox from 'honox/vite'
import client from 'honox/vite/client'
import pages from '@hono/vite-build/cloudflare-pages'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: ['./app/client.ts']
        }
      },
      plugins: [client()]
    }
  }

  return {
    build: {
      emptyOutDir: false
    },
    plugins: [
      honox(),
      pages()
    ]
  }
})
