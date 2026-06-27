// src/index.ts
import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { apiRouter } from './api/index'
import { fetchBuzzerPanel } from './api/buzzerpanel'
import { cronRouter } from './api/cron'

export type Bindings = {
  DB: D1Database
  CONFIG_KV: KVNamespace
  JWT_SECRET: string
  CRON_SECRET: string
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api', apiRouter)

const frontendApp = createApp()
app.route('/', frontendApp)
app.route('/api/cron', cronRouter)

app.notFound((c) => {
  return c.text('Halaman tidak ditemukan atau API Endpoint tidak valid.', 404)
})

export default {
  fetch: app.fetch,
  
  async scheduled(event: any, env: Bindings, ctx: any) {
    const activeOrders = await env.DB.prepare(`
      SELECT id, provider_order_id FROM orders 
      WHERE status IN ('pending', 'processing', 'in progress', 'sedang berjalan', 'sedang diproses') 
      LIMIT 100
    `).all()

    if (!activeOrders.results || activeOrders.results.length === 0) return;

    const providerIds = activeOrders.results
      .map(o => o.provider_order_id)
      .filter(id => id !== null && id !== undefined)
      .join(',')

    if (!providerIds) return;

    try {
      const providerData = await env.DB.prepare('SELECT api_key, secret_key FROM providers WHERE slug = "buzzerpanel"').first()
      const apiKey = providerData?.api_key || ''
      const secretKey = providerData?.secret_key || ''

      const statusResponse = await fetchBuzzerPanel(apiKey as string, secretKey as string, 'status', {
        id: providerIds
      })
      
      const updateStatements = []
      const updateQuery = env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2')
      
      const dataObj = statusResponse.data || statusResponse

      for (const order of activeOrders.results) {
        const providerIdStr = String(order.provider_order_id)
        const orderStatusData = dataObj[providerIdStr]

        if (orderStatusData && orderStatusData.status) {
          let normalizedStatus = 'pending'
          const rawStatus = String(orderStatusData.status).toLowerCase().trim()
          
          if (['success', 'completed', 'selesai'].includes(rawStatus)) normalizedStatus = 'success'
          else if (['processing', 'in progress', 'sedang berjalan', 'sedang diproses'].includes(rawStatus)) normalizedStatus = 'processing'
          else if (['error', 'canceled', 'cancelled', 'fail', 'permintaan batal', 'batal'].includes(rawStatus)) normalizedStatus = 'error'
          else if (['partial'].includes(rawStatus)) normalizedStatus = 'partial'

          updateStatements.push(updateQuery.bind(normalizedStatus, order.id))
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
