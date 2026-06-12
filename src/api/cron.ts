// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (BATCH CHECKING)
// =========================================================
cronRouter.get('/sync-orders', async (c) => {
  const url = new URL(c.req.url)
  const cronKey = url.searchParams.get('key')?.trim()
  const systemSecret = c.env.CRON_SECRET

  // Proteksi eksekusi Cron
  if (cronKey !== 'KunciRahasiaSaya123' && cronKey !== systemSecret) {
    return c.json({ 
      error: 'Akses ditolak. Kunci Cron tidak valid.',
      received_key: cronKey || 'KOSONG_TIDAK_TERBACA'
    }, 401)
  }

  try {
    // PERBAIKAN: Menggunakan p.base_url sesuai skema tabel 'providers' Anda!
    // Tidak lagi mencari api_id dan api_key di database.
    const pendingOrdersData = await c.env.DB.prepare(`
      SELECT o.id as local_id, o.provider_order_id, p.slug as provider_slug, p.base_url
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN providers p ON s.provider_slug = p.slug
      WHERE o.status IN ('pending', 'processing', 'waiting', 'sedang berjalan')
        AND o.provider_order_id IS NOT NULL
      LIMIT 30
    `).all()

    const pendingOrders = pendingOrdersData.results || []

    if (pendingOrders.length === 0) {
      return c.json({ success: true, message: 'Tidak ada pesanan aktif yang perlu disinkronisasi saat ini.' })
    }

    // Kelompokkan ID pesanan berdasarkan provider API-nya
    const ordersByProvider: Record<string, any> = {}
    for (const order of pendingOrders) {
      if (!ordersByProvider[order.provider_slug]) {
        ordersByProvider[order.provider_slug] = {
          base_url: order.base_url,
          orders: []
        }
      }
      ordersByProvider[order.provider_slug].orders.push(order)
    }

    const updateQueries = []
    let updatedCount = 0

    // Eksekusi Request ke masing-masing Provider
    for (const providerSlug in ordersByProvider) {
      const provider = ordersByProvider[providerSlug]
      
      // Gabungkan Provider Order ID dengan koma (Contoh: "10023,10024,10025")
      const providerOrderIds = provider.orders.map((o: any) => o.provider_order_id).join(',')

      // KARENA KREDENSIAL TIDAK ADA DI DATABASE, KITA AMBIL DARI ENVIRONMENT (.dev.vars / CLOUDFLARE DASHBOARD)
      // Sistem akan mencoba mencari MEDANPEDIA_API_ID atau API_ID
      const apiId = c.env.MEDANPEDIA_API_ID || c.env.API_ID || ''
      const apiKey = c.env.MEDANPEDIA_API_KEY || c.env.API_KEY || ''

      if (!apiId || !apiKey) {
        console.error(`CRON ERROR: API ID / API Key untuk provider ${providerSlug} tidak ditemukan di Environment Variables.`)
        continue // Lewati provider ini dan lanjut ke yang lain jika API Key kosong
      }

      const payload = new URLSearchParams()
      payload.append('api_id', String(apiId))
      payload.append('api_key', String(apiKey))
      payload.append('action', 'status')
      payload.append('id', providerOrderIds)

      try {
        const response = await fetch(provider.base_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: payload.toString()
        })

        const result = await response.json()

        // Mapping dan Parsing Respon API
        if (result && result.status && result.data) {
          for (const order of provider.orders) {
            const apiData = result.data[order.provider_order_id]
            
            if (apiData) {
              const rawStatus = String(apiData.status).toLowerCase()
              let normalizedStatus = 'pending'
              
              if (['success', 'completed'].includes(rawStatus)) normalizedStatus = 'success'
              else if (['processing', 'in progress', 'sedang berjalan'].includes(rawStatus)) normalizedStatus = 'processing'
              else if (['error', 'canceled', 'cancelled'].includes(rawStatus)) normalizedStatus = 'error'
              else if (['partial'].includes(rawStatus)) normalizedStatus = 'partial'

              const startCount = parseInt(apiData.start_count) || 0
              const remains = parseInt(apiData.remains) || 0

              updateQueries.push(
                c.env.DB.prepare(`
                  UPDATE orders 
                  SET status = ?1, start_count = ?2, remains = ?3 
                  WHERE id = ?4
                `).bind(normalizedStatus, startCount, remains, order.local_id)
              )
              updatedCount++
            }
          }
        }
      } catch (fetchError) {
        console.error(`Gagal menghubungi provider ${providerSlug}:`, fetchError)
      }
    }

    // Eksekusi Batch Update secara Atomik
    if (updateQueries.length > 0) {
      await c.env.DB.batch(updateQueries)
    }

    return c.json({ 
      success: true, 
      message: `Pengecekan selesai. ${updatedCount} pesanan berhasil disinkronisasi.`,
      processed_orders: pendingOrders.length
    })

  } catch (error: any) {
    return c.json({ error: 'Gagal mengeksekusi Cron Job.', details: error.message }, 500)
  }
})
