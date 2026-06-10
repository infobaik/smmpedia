// src/index.ts
import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { apiRouter } from './api/index'

export type Bindings = {
  DB: D1Database
  CONFIG_KV: KVNamespace
  JWT_SECRET: string
  CRON_SECRET: string
  MEDANPEDIA_API_KEY: string
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Rute API Terpusat (Backend)
app.route('/api', apiRouter)

// Rute Frontend (HonoX)
const frontendApp = createApp()
app.route('/', frontendApp)

// Menangani permintaan 404 agar tidak error di serverless
app.notFound((c) => {
  return c.text('Halaman tidak ditemukan atau API Endpoint tidak valid.', 404)
})

export default app
