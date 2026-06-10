// src/api/cron.ts
import { Hono } from 'hono'
import { fetchMedanpedia } from './medanpedia'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

cronRouter.get('/sync-status', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader !== `Bearer ${c.env.CRON_SECRET}`) {
    return c.json({ error: 'Akses Ditolak. Token CRON tidak valid.' }, 401)
  }

  // Mengambil maksimal 100 pesanan aktif (batas wajar untuk multi-status provider)
  const activeOrders = await c.env.DB.prepare(`
    SELECT id, provider_order_id FROM orders 
    WHERE status IN ('pending', 'processing', 'in progress') 
    LIMIT 100
  `).all()

  if (!activeOrders.results || activeOrders.results.length === 0) {
    return c.json({ success: true, message: 'Tidak ada pesanan untuk disinkronkan saat ini.' })
  }

  const providerIds = activeOrders.results.map(o => o.provider_order_id).join(',')

  try {
    const statusResponse = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'status', {
      orders: providerIds
    })
    
    const updateStatements = []
    const updateQuery = c.env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2')

    for (const order of activeOrders.results) {
      const providerIdStr = String(order.provider_order_id)
      const orderStatusData = statusResponse[providerIdStr]

      if (orderStatusData && orderStatusData.status) {
        const newStatus = orderStatusData.status.toLowerCase()
        updateStatements.push(updateQuery.bind(newStatus, order.id))
      }
    }

    if (updateStatements.length > 0) {
      await c.env.DB.batch(updateStatements)
    }

    return c.json({ 
      success: true, 
      message: `${updateStatements.length} pesanan berhasil disinkronkan dan diperbarui dari provider.` 
    })
  } catch (error) {
    return c.json({ error: 'Terjadi kesalahan saat terhubung dengan API Provider Pusat' }, 502)
  }
})
