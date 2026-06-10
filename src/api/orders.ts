import { Hono } from 'hono'
import { fetchMedanpedia } from './medanpedia'
import type { Bindings } from '../index'

export const ordersRouter = new Hono<{ Bindings: Bindings }>()

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
    // MURNI TANPA MEDIA UPLOAD
    const { userId, localServiceId, link, quantity, idempotencyKey } = body

    if (!userId || !localServiceId || !link || !quantity || !idempotencyKey) {
      return c.json({ error: 'Data pesanan tidak lengkap' }, 400)
    }

    // Proteksi Double-Click (Idempotency)
    try {
      await c.env.DB.prepare('INSERT INTO idempotency_store (key) VALUES (?1)').bind(idempotencyKey).run()
    } catch {
      return c.json({ error: 'Pesanan sedang diproses, harap tunggu...' }, 409)
    }

    // Pengecekan Service menggunakan provider_slug (sesuai normalisasi DB terbaru)
    const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?1 AND status = "active"').bind(localServiceId).first()
    if (!service) return c.json({ error: 'Layanan tidak valid atau sedang tidak aktif' }, 404)

    const charge = (Number(service.rate) + Number(service.margin || 0)) * (quantity / 1000)

    // Pengecekan dan Pemotongan Saldo Atomik
    const deductResult = await c.env.DB.prepare(`
      UPDATE users SET balance = balance - ?1 WHERE id = ?2 AND balance >= ?1
    `).bind(charge, userId).run()

    if (deductResult.meta.changes === 0) return c.json({ error: 'Saldo tidak mencukupi untuk pesanan ini' }, 400)

    let providerOrderIdStr = null;
    let isNetworkError = false;
    let providerErrorMessage = null;

    // ==========================================
    // ROUTING PROVIDER
    // ==========================================
    if (service.provider_slug === 'medanpedia') {
      try {
        const providerResponse = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'add', {
          service: service.product_provider_id,
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
      // Routing ke Custom Provider
      const customProvider = await c.env.DB.prepare('SELECT * FROM providers WHERE slug = ?1 AND status = "active"').bind(service.provider_slug).first()
      
      if (!customProvider) {
        providerErrorMessage = "Konfigurasi Custom Provider sedang offline."
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
             providerErrorMessage = customResult[mapping.error_key] || "Pesanan ditolak oleh server pusat."
          }
        } catch (e) {
          isNetworkError = true
        }
      }
    }

    // ==========================================
    // FINALISASI HASIL
    // ==========================================
    if (isNetworkError) {
      const localOrderId = crypto.randomUUID()
      await c.env.DB.prepare(`
        INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, status)
        VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, 'manual_reconciliation')
      `).bind(localOrderId, userId, localServiceId, link, quantity, charge).run()

      return c.json({ success: true, orderId: localOrderId, message: 'Pesanan diterima (API Gangguan, masuk antrean manual).' })
    }

    if (providerErrorMessage) {
      // Refund instan jika Provider Pusat menolak
      await c.env.DB.prepare(`UPDATE users SET balance = balance + ?1 WHERE id = ?2`).bind(charge, userId).run()
      return c.json({ error: `Gagal diproses pusat: ${providerErrorMessage}. Saldo dikembalikan.` }, 400)
    }

    // Berhasil diteruskan ke pusat
    const localOrderId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')
    `).bind(localOrderId, userId, localServiceId, providerOrderIdStr, link, quantity, charge).run()

    return c.json({ success: true, orderId: localOrderId, message: 'Pesanan berhasil dikirim ke server pusat.' })

  } catch (error) {
    return c.json({ error: 'Terjadi kesalahan sistem internal.' }, 500)
  }
})
