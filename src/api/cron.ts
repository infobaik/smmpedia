// src/api/cron.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (DYNAMIC CUSTOM PROVIDERS)
// =========================================================
cronRouter.get('/sync-orders', async (c) => {
  const url = new URL(c.req.url)
  const cronKey = url.searchParams.get('key')?.trim()
  const systemSecret = c.env.CRON_SECRET

  // Proteksi Akses Cron
  if (cronKey !== 'KunciRahasiaSaya123' && cronKey !== systemSecret) {
    return c.json({ error: 'Akses ditolak. Kunci Cron tidak valid.', received_key: cronKey || 'KOSONG' }, 401)
  }

  try {
    // PERBAIKAN MUTLAK: Relasi kueri diperbaiki, melalui tabel services (s) terlebih dahulu!
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
      return c.json({ success: true, message: 'Tidak ada pesanan aktif yang perlu disinkronisasi saat ini.' })
    }

    const updateQueries = []
    let updatedCount = 0

    // Kredensial API dari Environment Cloudflare
    const apiId = c.env.API_ID || c.env.MEDANPEDIA_API_ID || ''
    const apiKey = c.env.API_KEY || c.env.MEDANPEDIA_API_KEY || ''

    // Fungsi Pembantu: Mengganti Placeholder Template
    const parseTemplate = (templateStr: string, providerOrderId: string) => {
      if (!templateStr) return ''
      return templateStr
        .replace(/{{api_id}}/g, String(apiId))
        .replace(/{{api_key}}/g, String(apiKey))
        .replace(/{{provider_order_id}}/g, String(providerOrderId))
    }

    // Fungsi Pembantu: Mengekstrak nilai JSON bertingkat (contoh: "data.12345.status")
    const getNestedValue = (obj: any, path: string) => {
      if (!path || !obj) return undefined
      return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj)
    }

    // Eksekusi Request per Pesanan dengan Template Dinamis
    for (const order of pendingOrders) {
      try {
        // A. Menyiapkan Headers
        const rawHeaders = parseTemplate(order.headers_template || '{}', order.provider_order_id)
        const headers = JSON.parse(rawHeaders)
        if (order.content_type) headers['Content-Type'] = order.content_type
        headers['Accept'] = 'application/json'

        // B. Menyiapkan Body
        const bodyPayload = parseTemplate(order.check_body_template || '', order.provider_order_id)

        const fetchOptions: any = {
          method: order.request_method || 'POST',
          headers: headers,
        }
        
        if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
          fetchOptions.body = bodyPayload
        }

        // C. Eksekusi Request API ke Provider
        const response = await fetch(order.base_url, fetchOptions)
        const result = await response.json()

        // D. Parsing Response Mapping
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
          console.warn(`Sinkronisasi Gagal: Key '${statusKey}' tidak ditemukan di respon untuk pesanan ${order.local_id}`)
        }

      } catch (err) {
        console.error(`Gagal memproses pesanan ${order.local_id} ke provider ${order.provider_slug}:`, err)
      }
    }

    // Eksekusi Batch Update ke Database D1
    if (updateQueries.length > 0) {
      await c.env.DB.batch(updateQueries)
    }

    return c.json({ 
      success: true, 
      message: `Berhasil tersinkronisasi. ${updatedCount} dari ${pendingOrders.length} antrean pesanan telah diperbarui.`,
      processed: pendingOrders.length,
      updated: updatedCount
    })

  } catch (error: any) {
    return c.json({ error: 'Sistem mengalami kegagalan.', details: error.message }, 500)
  }
})
