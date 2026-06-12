// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

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
      WHERE o.status IN ('pending', 'processing', 'waiting', 'sedang berjalan')
        AND o.provider_order_id IS NOT NULL
      LIMIT 30
    `).all()

    const pendingOrders = pendingOrdersData.results || []

    if (pendingOrders.length === 0) {
      return c.json({ success: true, message: 'Tidak ada pesanan aktif.' })
    }

    const updateQueries = []
    let updatedCount = 0
    const debugLogs = [] // KITA TAMBAHKAN PENAMPUNG DEBUG DI SINI

    const apiId = c.env.API_ID || c.env.MEDANPEDIA_API_ID || ''
    const apiKey = c.env.API_KEY || c.env.MEDANPEDIA_API_KEY || ''

    const parseTemplate = (templateStr: string, providerOrderId: string) => {
      if (!templateStr) return ''
      return templateStr
        .replace(/{{api_id}}/g, String(apiId))
        .replace(/{{api_key}}/g, String(apiKey))
        .replace(/{{provider_order_id}}/g, String(providerOrderId))
    }

    const getNestedValue = (obj: any, path: string) => {
      if (!path || !obj) return undefined
      return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj)
    }

    for (const order of pendingOrders) {
      try {
        const rawHeaders = parseTemplate(order.headers_template || '{}', order.provider_order_id)
        const headers = JSON.parse(rawHeaders)
        if (order.content_type) headers['Content-Type'] = order.content_type
        headers['Accept'] = 'application/json'

        const bodyPayload = parseTemplate(order.check_body_template || '', order.provider_order_id)

        const fetchOptions: any = { method: order.request_method || 'POST', headers: headers }
        if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
          fetchOptions.body = bodyPayload
        }

        const response = await fetch(order.base_url, fetchOptions)
        const result = await response.json()

        const rawMapping = parseTemplate(order.response_mapping || '{}', order.provider_order_id)
        const mapping = JSON.parse(rawMapping)

        const statusKey = mapping.status_key || 'status'
        const startCountKey = mapping.start_count_key || 'start_count'
        const remainsKey = mapping.remains_key || 'remains'

        const rawStatus = getNestedValue(result, statusKey)

        if (rawStatus !== undefined) {
          const statusStr = String(rawStatus).toLowerCase()
          let normalizedStatus = 'pending'
          
          const successVal = mapping.success_value ? String(mapping.success_value).toLowerCase() : 'success'
          const processingVal = mapping.processing_value ? String(mapping.processing_value).toLowerCase() : 'processing'
          
          if (statusStr === successVal || ['success', 'completed'].includes(statusStr)) normalizedStatus = 'success'
          else if (statusStr === processingVal || ['processing', 'in progress', 'sedang berjalan'].includes(statusStr)) normalizedStatus = 'processing'
          else if (['error', 'canceled', 'cancelled', 'fail'].includes(statusStr)) normalizedStatus = 'error'
          else if (['partial'].includes(statusStr)) normalizedStatus = 'partial'

          const startCount = parseInt(getNestedValue(result, startCountKey)) || 0
          const remains = parseInt(getNestedValue(result, remainsKey)) || 0

          updateQueries.push(
            c.env.DB.prepare(`
              UPDATE orders 
              SET status = ?1, start_count = ?2, remains = ?3 
              WHERE id = ?4
            `).bind(normalizedStatus, startCount, remains, order.local_id)
          )
          updatedCount++
        } else {
          // JIKA GAGAL MENEMUKAN STATUS, MASUKKAN KE LOG DEBUG
          debugLogs.push({
            pesanan_id: order.local_id,
            provider_order_id: order.provider_order_id,
            mapping_dicari: statusKey,
            balasan_asli_api: result
          })
        }

      } catch (err: any) {
        debugLogs.push({ pesanan_id: order.local_id, error_koneksi: err.message })
      }
    }

    if (updateQueries.length > 0) {
      await c.env.DB.batch(updateQueries)
    }

    return c.json({ 
      success: true, 
      message: `Pengecekan selesai. ${updatedCount} pesanan berhasil disinkronisasi.`,
      processed_orders: pendingOrders.length,
      debug_error_logs: debugLogs // KITA MUNCULKAN DI SINI
    })

  } catch (error: any) {
    return c.json({ error: 'Sistem mengalami kegagalan.', details: error.message }, 500)
  }
})
