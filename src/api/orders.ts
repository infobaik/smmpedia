// src/api/orders.ts
import { Hono } from 'hono'
import { fetchMedanpedia } from './medanpedia'
import type { Bindings } from '../index'

export const ordersRouter = new Hono<{ Bindings: Bindings }>()

// Fungsi helper dinamis untuk custom provider
function buildPayload(templateStr: string, data: Record<string, any>) {
  let parsedStr = templateStr;
  for (const [key, value] of Object.entries(data)) {
    parsedStr = parsedStr.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return JSON.parse(parsedStr);
}

ordersRouter.post('/create', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, localServiceId, link, quantity, mediaUrl, idempotencyKey } = body

    if (!userId || !localServiceId || !link || !quantity || !idempotencyKey) {
      return c.json({ error: 'Data pesanan tidak lengkap' }, 400)
    }

    try {
      await c.env.DB.prepare('INSERT INTO idempotency_store (key) VALUES (?1)').bind(idempotencyKey).run()
    } catch {
      return c.json({ error: 'Pesanan duplikat' }, 409)
    }

    const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?1').bind(localServiceId).first()
    if (!service) return c.json({ error: 'Layanan tidak valid' }, 404)

    const charge = (Number(service.rate) + Number(service.margin || 0)) * (quantity / 1000)

    const deductResult = await c.env.DB.prepare(`
      UPDATE users SET balance = balance - ?1 WHERE id = ?2 AND balance >= ?1
    `).bind(charge, userId).run()

    if (deductResult.meta.changes === 0) return c.json({ error: 'Saldo tidak mencukupi' }, 400)

    let providerOrderIdStr = null;
    let isNetworkError = false;
    let providerErrorMessage = null;

    // ==========================================
    // ROUTING PROVIDER DINAMIS
    // ==========================================
    if (service.provider === 'medanpedia') {
      try {
        const providerResponse = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'add', {
          service: service.product_provider_id, // Menggunakan kolom yang benar
          link: link,
          quantity: quantity
        })

        if (providerResponse.error) {
          providerErrorMessage = providerResponse.error
        } else if (providerResponse.order) {
          providerOrderIdStr = providerResponse.order.toString()
        } else {
          isNetworkError = true
        }
      } catch (e) {
        isNetworkError = true
      }

    } else {
      // Menangani Custom Provider
      const customProvider = await c.env.DB.prepare('SELECT * FROM custom_providers WHERE slug = ?1 AND status = "active"').bind(service.provider).first()
      
      if (!customProvider) {
        providerErrorMessage = "Konfigurasi Custom Provider tidak ditemukan atau tidak aktif."
      } else {
        try {
          const payload = buildPayload(customProvider.order_body_template as string, { 
            link: link, 
            quantity: quantity, 
            product_provider_id: service.product_provider_id 
          })

          const headers = JSON.parse(customProvider.headers_template as string)
          let bodyData: BodyInit;

          if (customProvider.content_type === 'application/x-www-form-urlencoded') {
            const urlSearchParams = new URLSearchParams()
            for (const [key, value] of Object.entries(payload)) { urlSearchParams.append(key, String(value)) }
            bodyData = urlSearchParams.toString()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
          } else {
            bodyData = JSON.stringify(payload)
            headers['Content-Type'] = 'application/json'
          }

          const response = await fetch(customProvider.base_url as string, {
            method: customProvider.request_method as string,
            headers: headers,
            body: bodyData
          })

          const customResult = await response.json()
          const mapping = JSON.parse(customProvider.response_mapping as string)
          
          if (customResult[mapping.order_id_key]) {
             providerOrderIdStr = customResult[mapping.order_id_key].toString()
          } else {
             providerErrorMessage = customResult[mapping.error_key] || "Penyedia menolak pesanan tanpa alasan spesifik."
          }
        } catch (e) {
          isNetworkError = true
        }
      }
    }

    // ==========================================
    // PENANGANAN HASIL ROUTING
    // ==========================================
    if (isNetworkError) {
      const localOrderId = crypto.randomUUID()
      await c.env.DB.prepare(`
        INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, reference_media_url, status)
        VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, 'manual_reconciliation')
      `).bind(localOrderId, userId, localServiceId, link, quantity, charge, mediaUrl || null).run()

      return c.json({ success: true, orderId: localOrderId, message: 'Pesanan diterima (Menunggu rekonsiliasi jaringan).' })
    }

    if (providerErrorMessage) {
      // Refund
      await c.env.DB.prepare(`UPDATE users SET balance = balance + ?1 WHERE id = ?2`).bind(charge, userId).run()
      return c.json({ error: `Ditolak Provider: ${providerErrorMessage}. Saldo dikembalikan.` }, 400)
    }

    // Sukses Normal
    const localOrderId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, reference_media_url, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')
    `).bind(localOrderId, userId, localServiceId, providerOrderIdStr, link, quantity, charge, mediaUrl || null).run()

    return c.json({ success: true, orderId: localOrderId, message: 'Pesanan berhasil dikirim ke provider.' })

  } catch (error) {
    return c.json({ error: 'Terjadi kesalahan sistem internal.' }, 500)
  }
})
