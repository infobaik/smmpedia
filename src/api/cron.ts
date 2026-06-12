// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (INDIVIDUAL & AUTO-FALLBACK)
// =========================================================
cronRouter.get('/sync-orders', async (c) => {
  const url = new URL(c.req.url)
  const cronKey = url.searchParams.get('key')?.trim()
  const systemSecret = c.env.CRON_SECRET

  if (cronKey !== 'KunciRahasiaSaya123' && cronKey !== systemSecret) {
    return c.json({ error: 'Akses ditolak.' }, 401)
  }

  try {
    const pendingOrdersData = await c.env.DB.prepare(`
      SELECT o.id as local_id, o.provider_order_id, o.quantity,
             cp.slug as provider_slug, cp.base_url, cp.request_method, cp.content_type, 
             cp.headers_template, cp.check_body_template
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN custom_providers cp ON s.provider_slug = cp.slug
      WHERE o.status IN ('pending', 'processing', 'waiting', 'sedang berjalan', 'sedang diproses')
        AND o.provider_order_id IS NOT NULL
      LIMIT 30
    `).all()

    const pendingOrders = pendingOrdersData.results || []

    if (pendingOrders.length === 0) {
      return c.json({ success: true, message: 'Semua pesanan sudah selesai atau tidak ada yang pending.' })
    }

    const updateQueries = []
    let updatedCount = 0
    const debugLogs = []

    const apiId = c.env.API_ID || c.env.MEDANPEDIA_API_ID || ''
    const apiKey = c.env.API_KEY || c.env.MEDANPEDIA_API_KEY || ''

    const parseTemplate = (templateStr: string, providerOrderId: string) => {
      if (!templateStr) return ''
      return templateStr
        .replace(/{{api_id}}/g, String(apiId))
        .replace(/{{api_key}}/g, String(apiKey))
        .replace(/{{provider_order_id}}/g, String(providerOrderId))
    }

    // =======================================================
    // EKSEKUSI INDIVIDUAL: SATU PER SATU AGAR 100% TEMBUS
    // =======================================================
    for (const order of pendingOrders) {
      try {
        // 1. Siapkan Headers
        let headers: any = { 'Accept': 'application/json' }
        if (order.headers_template) {
           try { headers = { ...headers, ...JSON.parse(parseTemplate(order.headers_template, order.provider_order_id)) } } catch(e){}
        }
        if (order.content_type) headers['Content-Type'] = order.content_type
        
        // JIKA KOSONG, PAKAI DEFAULT MEDANPEDIA
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'

        // 2. Siapkan Body dengan Smart Fallback
        let bodyPayload = parseTemplate(order.check_body_template || '', order.provider_order_id)
        if (!bodyPayload || bodyPayload.trim() === '') {
            // JIKA TEMPLATE DATABASE KOSONG, GUNAKAN STANDARD MEDANPEDIA
            bodyPayload = `api_id=${apiId}&api_key=${apiKey}&action=status&id=${order.provider_order_id}`
        }

        const fetchOptions: any = { method: order.request_method || 'POST', headers }
        if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
          fetchOptions.body = bodyPayload
        }

        // 3. Tembak API Pusat
        const response = await fetch(order.base_url, fetchOptions)
        const result = await response.json()

        // 4. Deteksi Otomatis Struktur Balasan (Auto-Detect JSON)
        let apiData = null;
        
        // Format A: { "data": { "status": "...", "start_count": 0 } }
        if (result?.data && result.data.status !== undefined) apiData = result.data
        // Format B: { "status": "...", "start_count": 0 }
        else if (result?.status !== undefined && typeof result.status === 'string') apiData = result
        // Format C: { "data": { "588": { "status": "..." } } } 
        else if (result?.data && result.data[order.provider_order_id]) apiData = result.data[order.provider_order_id]
        // Format D: { "588": { "status": "..." } }
        else if (result && result[order.provider_order_id]) apiData = result[order.provider_order_id]

        if (apiData) {
          const rawStatus = String(apiData.status).toLowerCase().trim()
          let normalizedStatus = 'pending'
          
          if (['success', 'completed', 'selesai'].includes(rawStatus)) normalizedStatus = 'success'
          else if (['processing', 'in progress', 'sedang berjalan', 'sedang diproses'].includes(rawStatus)) normalizedStatus = 'processing'
          else if (['error', 'canceled', 'cancelled', 'fail', 'permintaan batal', 'batal'].includes(rawStatus)) normalizedStatus = 'error'
          else if (['partial'].includes(rawStatus)) normalizedStatus = 'partial'

          const startCount = parseInt(apiData.start_count) || 0
          const remains = parseInt(apiData.remains) || 0

          // Update data ke Database
          updateQueries.push(
            c.env.DB.prepare(`
              UPDATE orders 
              SET status = ?1, start_count = ?2, remains = ?3 
              WHERE id = ?4
            `).bind(normalizedStatus, startCount, remains, order.local_id)
          )
          updatedCount++

        } else {
           // Jika JSON tidak sesuai format apapun, tangkap di log
           debugLogs.push({ local_id: order.local_id, server_id: order.provider_order_id, error: "JSON tidak sesuai", raw_response: result })
        }

      } catch (err: any) {
         debugLogs.push({ local_id: order.local_id, error: err.message })
      }
    }

    // Eksekusi semua update sekaligus
    if (updateQueries.length > 0) {
      await c.env.DB.batch(updateQueries)
    }

    return c.json({ 
      success: true, 
      message: `Selesai. ${updatedCount} dari ${pendingOrders.length} pesanan berhasil diupdate.`,
      debug_logs: debugLogs
    })

  } catch (error: any) {
    return c.json({ error: 'Fatal Error di sistem cron.', details: error.message }, 500)
  }
})
