// src/index.ts
import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { apiRouter } from './api/index'
import { fetchMedanpedia } from './api/medanpedia'

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

export default {
  fetch: app.fetch,
  
  // Handler untuk Cloudflare Cron Triggers
  async scheduled(event: any, env: Bindings, ctx: any) {
    const activeOrders = await env.DB.prepare(`
      SELECT id, provider_order_id FROM orders 
      WHERE status IN ('pending', 'processing', 'in progress') 
      LIMIT 100
    `).all()

    if (!activeOrders.results || activeOrders.results.length === 0) return;

    // Filter id provider yang valid agar tidak mengirim null ke pusat
    const providerIds = activeOrders.results
      .map(o => o.provider_order_id)
      .filter(id => id !== null && id !== undefined)
      .join(',')

    if (!providerIds) return;

    try {
      const statusResponse = await fetchMedanpedia(env.MEDANPEDIA_API_KEY, 'status', {
        orders: providerIds
      })
      
      const updateStatements = []
      const updateQuery = env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2')

      for (const order of activeOrders.results) {
        const providerIdStr = String(order.provider_order_id)
        const orderStatusData = statusResponse[providerIdStr]

        if (orderStatusData && orderStatusData.status) {
          updateStatements.push(updateQuery.bind(orderStatusData.status.toLowerCase(), order.id))
        }
      }

      if (updateStatements.length > 0) {
        await env.DB.batch(updateStatements)
      }
    } catch (error) {
      console.error('Cron Error:', error)
    }
  }
}
