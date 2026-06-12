// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (BATCH CHECKING)
// =========================================================
cronRouter.get('/sync-orders', async (c) => {
  // 1. Proteksi Endpoint (Sangat Penting!)
  // Pastikan URL ini hanya bisa diakses dengan menyertakan ?key=RAHASIA
  // Anda bisa mengatur CRON_SECRET di file .dev.vars atau Cloudflare Dashboard
  const cronKey = c.req.query('key')
  if (cronKey !== (c.env.CRON_SECRET || 'KunciRahasiaSaya123')) {
    return c.json({ error: 'Akses ditolak. Kunci Cron tidak valid.' }, 401)
  }

  try {
    // 2. Ambil pesanan yang belum selesai (Maks. 30 per eksekusi agar tidak timeout)
    const pendingOrdersData = await c.env.DB.prepare(`
      SELECT o.id as local_id, o.provider_order_id, p.slug as provider_slug, p.api_url, p.api_id, p.api_key
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

    // 3. Kelompokkan ID pesanan berdasarkan provider API-nya
    // Berguna jika nanti Anda punya provider selain Medanpedia
    const ordersByProvider: Record<string, any> = {}
    for (const order of pendingOrders) {
      if (!ordersByProvider[order.provider_slug]) {
        ordersByProvider[order.provider_slug] = {
          api_url: order.api_url,
          api_id: order.api_id,
          api_key: order.api_key,
          orders: []
        }
      }
      ordersByProvider[order.provider_slug].orders.push(order)
    }

    const updateQueries = []
    let updatedCount = 0

    // 4. Eksekusi Request ke masing-masing Provider
    for (const providerSlug in ordersByProvider) {
      const provider = ordersByProvider[providerSlug]
      
      // Gabungkan Provider Order ID dengan koma (Contoh: "10023,10024,10025")
      const providerOrderIds = provider.orders.map((o: any) => o.provider_order_id).join(',')

      // Siapkan payload standar API SMM Panel
      const payload = new URLSearchParams()
      payload.append('api_id', provider.api_id)
      payload.append('api_key', provider.api_key)
      payload.append('action', 'status')
      payload.append('id', providerOrderIds)

      try {
        const response = await fetch(provider.api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: payload.toString()
        })

        const result = await response.json()

        // 5. Mapping dan Parsing Respon API
        if (result && result.status && result.data) {
          for (const order of provider.orders) {
            const apiData = result.data[order.provider_order_id]
            
            if (apiData) {
              const rawStatus = String(apiData.status).toLowerCase()
              let normalizedStatus = 'pending' // Default fallback
              
              // Normalisasi status dari Medanpedia ke sistem Anda
              if (['success', 'completed'].includes(rawStatus)) normalizedStatus = 'success'
              else if (['processing', 'in progress'].includes(rawStatus)) normalizedStatus = 'processing'
              else if (['error', 'canceled', 'cancelled'].includes(rawStatus)) normalizedStatus = 'error'
              else if (['partial'].includes(rawStatus)) normalizedStatus = 'partial'

              const startCount = parseInt(apiData.start_count) || 0
              const remains = parseInt(apiData.remains) || 0

              // Masukkan ke antrean batch update
              updateQueries.push(
                c.env.DB.prepare(`
                  UPDATE orders 
                  SET status = ?1, start_count = ?2, remains = ?3 
                  WHERE id = ?4
                `).bind(normalizedStatus, startCount, remains, order.local_id)
              )
              updatedCount++
              
              // Note: Jika error/partial, admin tetap harus memproses refund 
              // melalui halaman Manajemen Transaksi secara manual demi keamanan arus kas.
            }
          }
        }
      } catch (fetchError) {
        console.error(`Gagal menghubungi provider ${providerSlug}:`, fetchError)
      }
    }

    // 6. Eksekusi Batch Update secara Atomik
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
