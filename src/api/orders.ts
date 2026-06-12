// src/api/cron.ts
import { Hono } from 'hono'
import { fetchMedanpedia } from './medanpedia' // KITA PANGGIL FUNGSI SAKTI ANDA DI SINI!
import type { Bindings } from '../index'

export const cronRouter = new Hono<{ Bindings: Bindings }>()

// Fungsi pembantu persis seperti di orders.ts
function buildPayload(templateStr: string, data: Record<string, any>) {
  let parsedStr = templateStr;
  for (const [key, value] of Object.entries(data)) {
    parsedStr = parsedStr.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return JSON.parse(parsedStr);
}

// =========================================================
// CRON JOB: SINKRONISASI STATUS PESANAN (FINAL & 100% IDENTIK DENGAN ORDERS.TS)
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
             s.provider_slug, 
             p.slug as p_slug, p.type as provider_type, p.base_url, p.request_method, 
             p.content_type, p.headers_template, p.check_body_template, p.response_mapping
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN providers p ON s.provider_slug = p.slug
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

    for (const order of pendingOrders) {
      try {
        let result: any = null;

        // ==========================================
        // ROUTING PROVIDER (SAMA SEPERTI DI ORDERS.TS)
        // ==========================================
        if (order.provider_slug === 'medanpedia') {
          // GUNAKAN FUNGSI BAWAAN MEDANPEDIA ANDA!
          // Untuk check status, biasanya parameter objeknya berisi "id"
          result = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'status', {
            id: order.provider_order_id
          })
          
          debugLogs.push({ msg: "Log Medanpedia", result })
          
        } else {
          // CUSTOM PROVIDER
          if (!order.base_url) {
             debugLogs.push({ local_id: order.local_id, error: "Base URL Provider kosong." })
             continue
          }

          const payload = buildPayload(order.check_body_template || '{}', { 
            provider_order_id: order.provider_order_id,
            api_id: c.env.API_ID || '',
            api_key: c.env.API_KEY || ''
          })

          const headers = JSON.parse(order.headers_template || '{}')
          let bodyData: BodyInit;

          if (order.content_type === 'application/x-www-form-urlencoded') {
            const urlSearchParams = new URLSearchParams()
            for (const [key, value] of Object.entries(payload)) { urlSearchParams.append(key, String(value)) }
            bodyData = urlSearchParams.toString()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
          } else {
            bodyData = JSON.stringify(payload)
            headers['Content-Type'] = 'application/json'
          }

          const response = await fetch(order.base_url, {
            method: order.request_method || 'POST',
            headers: headers,
            body: bodyData
          })

          result = await response.json()
        }

        // ==========================================
        // AUTO-DETECT STATUS RESPONSE JSON
        // ==========================================
        let apiData = null;
        
        // A. Cek Response Mapping Khusus Custom Provider
        if (order.provider_slug !== 'medanpedia' && order.response_mapping && order.response_mapping !== '{}') {
           const mapping = buildPayload(order.response_mapping, { provider_order_id: order.provider_order_id })
           const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj)
           
           const statusVal = getNestedValue(result, mapping.status_key || 'status')
           if (statusVal !== undefined) {
             apiData = {
               status: statusVal,
               start_count: getNestedValue(result, mapping.start_count_key || 'start_count'),
               remains: getNestedValue(result, mapping.remains_key || 'remains')
             }
           }
        } 
        
        // B. Jika tidak ada mapping khusus, gunakan sistem Auto-Detect SMM Panel
        if (!apiData) {
          if (result?.data && result.data.status !== undefined) apiData = result.data
          else if (result?.status !== undefined && typeof result.status === 'string') apiData = result
          else if (result?.data && result.data[order.provider_order_id]) apiData = result.data[order.provider_order_id]
          else if (result && result[order.provider_order_id]) apiData = result[order.provider_order_id]
        }

        if (apiData && apiData.status) {
          const rawStatus = String(apiData.status).toLowerCase().trim()
          let normalizedStatus = 'pending'
          
          if (['success', 'completed', 'selesai'].includes(rawStatus)) normalizedStatus = 'success'
          else if (['processing', 'in progress', 'sedang berjalan', 'sedang diproses'].includes(rawStatus)) normalizedStatus = 'processing'
          else if (['error', 'canceled', 'cancelled', 'fail', 'permintaan batal', 'batal'].includes(rawStatus)) normalizedStatus = 'error'
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
        } else {
           debugLogs.push({ local_id: order.local_id, server_id: order.provider_order_id, error: "JSON tidak sesuai format SMM Panel", raw_response: result })
        }

      } catch (err: any) {
         debugLogs.push({ local_id: order.local_id, error: err.message })
      }
    }

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
