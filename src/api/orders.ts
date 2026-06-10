// src/api/orders.ts
import { Hono } from 'hono'
import { fetchMedanpedia } from './medanpedia'
import type { Bindings } from '../index'

export const ordersRouter = new Hono<{ Bindings: Bindings }>()

ordersRouter.post('/create', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, localServiceId, link, quantity, mediaUrl, idempotencyKey } = body

    if (!userId || !localServiceId || !link || !quantity || !idempotencyKey) {
      return c.json({ error: 'Data pesanan tidak lengkap atau Kunci Idempotensi hilang' }, 400)
    }

    try {
      await c.env.DB.prepare(`
        INSERT INTO idempotency_store (key) VALUES (?1)
      `).bind(idempotencyKey).run()
    } catch (error) {
      return c.json({ error: 'Pesanan ini sedang diproses atau sudah pernah dikirim (Duplikat)' }, 409)
    }

    const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?1')
      .bind(localServiceId)
      .first()

    if (!service) {
      return c.json({ error: 'Layanan tidak valid atau tidak ditemukan' }, 404)
    }

    const charge = (Number(service.rate) + Number(service.margin || 0)) * (quantity / 1000)

    const deductResult = await c.env.DB.prepare(`
      UPDATE users SET balance = balance - ?1 
      WHERE id = ?2 AND balance >= ?1
    `).bind(charge, userId).run()

    if (deductResult.meta.changes === 0) {
      return c.json({ error: 'Saldo tidak mencukupi untuk memproses pesanan ini' }, 400)
    }

    const orderData = {
      service: service.provider_id,
      link: link,
      quantity: quantity
    }
    
    let providerResponse: any = null;
    let isNetworkError = false;

    try {
      providerResponse = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'add', orderData)
    } catch (apiError) {
      isNetworkError = true;
    }

    if (isNetworkError || (providerResponse && !providerResponse.error && !providerResponse.order)) {
      const localOrderId = crypto.randomUUID()
      
      await c.env.DB.prepare(`
        INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, reference_media_url, status)
        VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, 'manual_reconciliation')
      `).bind(localOrderId, userId, localServiceId, link, quantity, charge, mediaUrl || null).run()

      return c.json({ 
        success: true, 
        orderId: localOrderId,
        message: 'Pesanan diterima, namun respons provider tertunda. Status akan direkonsiliasi manual.' 
      })
    }

    if (providerResponse && providerResponse.error) {
      await c.env.DB.prepare(`
        UPDATE users SET balance = balance + ?1 WHERE id = ?2
      `).bind(charge, userId).run()
      
      return c.json({ error: `Pesanan ditolak oleh provider. Saldo dikembalikan. Detail: ${providerResponse.error}` }, 400)
    }

    const providerOrderId = providerResponse.order.toString()
    const localOrderId = crypto.randomUUID()

    await c.env.DB.prepare(`
      INSERT INTO orders (id, user_id, service_id, provider_order_id, link, quantity, charge, reference_media_url, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')
    `).bind(localOrderId, userId, localServiceId, providerOrderId, link, quantity, charge, mediaUrl || null).run()

    return c.json({ 
      success: true, 
      orderId: localOrderId,
      message: 'Pesanan berhasil dibuat dan saldo terpotong.' 
    })

  } catch (error) {
    return c.json({ error: 'Terjadi kesalahan sistem internal.' }, 500)
  }
})
