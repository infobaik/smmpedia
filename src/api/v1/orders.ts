// src/api/v1/orders.ts
import { Hono } from 'hono'
import type { Bindings } from '../../index'

export const v1OrdersRouter = new Hono<{ Bindings: Bindings, Variables: { api_user: any } }>()

v1OrdersRouter.post('/create', async (c) => {
  try {
    const user = c.get('api_user')
    const body = await c.req.json()
    const { service, target, quantity } = body

    if (!service || !target || !quantity) {
      return c.json({ status: false, message: 'Parameter service, target, dan quantity wajib diisi.' }, 400)
    }

    const srv = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?1 AND status = "active"').bind(service).first()
    if (!srv) return c.json({ status: false, message: 'Layanan tidak ditemukan atau tidak aktif.' }, 404)

    const charge = (Number(srv.rate) + Number(srv.margin || 0)) * (quantity / 1000)

    // Pengecekan saldo & pemotongan atomik
    const deductResult = await c.env.DB.prepare(`
      UPDATE users SET balance = balance - ?1 WHERE id = ?2 AND balance >= ?1
    `).bind(charge, user.id).run()

    if (deductResult.meta.changes === 0) {
      return c.json({ status: false, message: 'Saldo tidak mencukupi.' }, 400)
    }

    // Catat Pesanan
    const localOrderId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')
    `).bind(localOrderId, user.id, service, target, quantity, charge).run()

    // CATATAN: Eksekusi ke Medanpedia/Pusat sebaiknya ditarik oleh Cron Background
    // agar API Reseller Anda merespons dalam < 50ms (Asynchronous Processing).
    
    return c.json({
      status: true,
      message: 'Pesanan berhasil diterima.',
      data: { order_id: localOrderId, charge: charge, remain_balance: user.balance - charge }
    })
  } catch (err: any) {
    return c.json({ status: false, message: 'Format JSON tidak valid atau Server Error.' }, 500)
  }
})
