// src/api/webhook.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const webhookRouter = new Hono<{ Bindings: Bindings }>()

webhookRouter.post('/:slug', async (c) => {
  try {
    const providerSlug = c.req.param('slug')
    const body = await c.req.json()

    // Verifikasi keberadaan dan status provider
    const provider = await c.env.DB.prepare('SELECT * FROM custom_providers WHERE slug = ?1 AND status = "active"')
      .bind(providerSlug)
      .first()

    if (!provider) {
      return c.json({ error: 'Provider tidak terdaftar atau sedang tidak aktif' }, 404)
    }

    // Parsing aturan pemetaan JSON dari D1
    const mapping = JSON.parse(provider.response_mapping as string)
    
    const providerOrderId = body[mapping.order_id_key]
    const rawStatus = body[mapping.status_key]

    if (!providerOrderId || !rawStatus) {
      return c.json({ error: 'Payload webhook tidak memiliki key yang sesuai dengan konfigurasi pemetaan' }, 400)
    }

    // Eksekusi pembaruan status ke sistem lokal
    const updateResult = await c.env.DB.prepare('UPDATE orders SET status = ?1 WHERE provider_order_id = ?2')
      .bind(String(rawStatus).toLowerCase(), String(providerOrderId))
      .run()

    if (updateResult.meta.changes === 0) {
      return c.json({ error: 'ID Pesanan dari provider tidak ditemukan di database lokal Anda' }, 404)
    }

    return c.json({ success: true, message: 'Status pesanan berhasil diperbarui secara instan via Webhook' })
  } catch (error) {
    return c.json({ error: 'Kesalahan pemrosesan Webhook internal' }, 500)
  }
})
