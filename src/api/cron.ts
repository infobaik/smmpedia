// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (AUTO-DETECT SMM API)
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
      SELECT o.id as local_id, o.provider_order_id, 
             cp.slug as provider_slug, cp.base_url, cp.request_method, cp.content_type, 
             cp.headers_template, cp.check_body_template, cp.response_mapping
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN custom_providers cp ON s.provider_slug = cp.slug
      WHERE o.status IN ('pending', 'processing', 'waiting', 'sedang berjalan', 'sedang diproses')
        AND o.provider_order_id IS NOT NULL
      LIMIT 30
    `).all()

    const pendingOrders = pendingOrdersData.results || []

    if (pendingOrders.length === 0) {
      return c.json({ success: true, message: 'Tidak ada pesanan aktif yang perlu disinkronisasi.' })
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

    const ordersByProvider: Record<string, any> = {}
    for (const order of pendingOrders) {
      if (!ordersByProvider[order.provider_slug]) {
        ordersByProvider[order.provider_slug] = {
          base_url: order.base_url,
          request_method: order.request_method,
          content_type: order.content_type,
          headers_template: order.headers_template,
          check_body_template: order.check_body_template,
          orders: []
        }
      }
      ordersByProvider[order.provider_slug].orders.push(order)
    }

    for (const providerSlug in ordersByProvider) {
      const provider = ordersByProvider[providerSlug]
      const providerOrderIds = provider.orders.map((o: any) => o.provider_order_id).join(',')

      try {
        const rawHeaders = parseTemplate(provider.headers_template || '{}', providerOrderIds)
        const headers = JSON.parse(rawHeaders)
        if (provider.content_type) headers['Content-Type'] = provider.content_type
        headers['Accept'] = 'application/json'

        // PENTING: Pastikan template body di database custom_providers Anda memakai action=status
        const bodyPayload = parseTemplate(provider.check_body_template || '', providerOrderIds)

        const fetchOptions: any = { method: provider.request_method || 'POST', headers: headers }
        if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
          fetchOptions.body = bodyPayload
        }

        const response = await fetch(provider.base_url, fetchOptions)
        const result = await response.json()

        for (const order of provider.orders) {
          // -----------------------------------------------------
          // FITUR AUTO-DETECT SMM PANEL API FORMAT
          // -----------------------------------------------------
          let apiData = null;
          
          // Format Medanpedia/Irvankede: { "data": { "12345": { "status": "..." } } }
          if (result?.data && result.data[order.provider_order_id]) {
            apiData = result.data[order.provider_order_id]
          } 
          // Format PerfectPanel: { "12345": { "status": "..." } }
          else if (result && result[order.provider_order_id]) {
            apiData = result[order.provider_order_id]
          }
          // Format 1 ID (bukan batch): { "status": "...", "start_count": 0 }
          else if (result && result.status !== undefined && typeof result.status === 'string') {
            apiData = result
          }

          if (apiData) {
            const rawStatus = String(apiData.status).toLowerCase().trim()
            let normalizedStatus = 'pending'
            
            // PENCOCOKAN STATUS BAHASA INDONESIA & INGGRIS (Sesuai Screenshot Anda)
            if (['success', 'completed', 'selesai'].includes(rawStatus)) {
              normalizedStatus = 'success'
            } else if (['processing', 'in progress', 'sedang berjalan', 'sedang diproses'].includes(rawStatus)) {
              normalizedStatus = 'processing'
            } else if (['error', 'canceled', 'cancelled', 'fail', 'permintaan batal', 'batal'].includes(rawStatus)) {
              normalizedStatus = 'error'
            } else if (['partial'].includes(rawStatus)) {
              normalizedStatus = 'partial'
            }

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
          } else {
            debugLogs.push({
              pesanan_id: order.local_id,
              pesan: "Gagal menemukan ID ini di dalam JSON",
              json_dari_api: result
            })
          }
        }

      } catch (err: any) {
        debugLogs.push({ provider: providerSlug, error: err.message })
      }
    }

    if (updateQueries.length > 0) {
      await c.env.DB.batch(updateQueries)
    }

    return c.json({ 
      success: true, 
      message: `Pengecekan selesai. ${updatedCount} pesanan berhasil disinkronisasi.`,
      processed_orders: pendingOrders.length,
      debug_logs: debugLogs
    })

  } catch (error: any) {
    return c.json({ error: 'Sistem mengalami kegagalan.', details: error.message }, 500)
  }
})
