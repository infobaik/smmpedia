// src/api/v1/index.ts
import { Hono } from 'hono'
import type { Bindings } from '../../index'
import { v1OrdersRouter } from './orders'

// Gunakan Variables untuk menyimpan sesi API pengguna
export const apiV1Router = new Hono<{ Bindings: Bindings, Variables: { api_user: any } }>()

// MIDDLEWARE: Cek API Key Reseller
apiV1Router.use('/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key')
  
  if (!apiKey) {
    return c.json({ status: false, data: null, message: 'Akses Ditolak: API Key tidak disertakan pada Header x-api-key.' }, 401)
  }

  const user = await c.env.DB.prepare('SELECT id, username, balance, api_key FROM users WHERE api_key = ?1 AND status = "active"').bind(apiKey).first()
  
  if (!user) {
    return c.json({ status: false, data: null, message: 'Akses Ditolak: API Key tidak valid atau akun diblokir.' }, 401)
  }

  c.set('api_user', user)
  await next()
})

// Endpoint untuk cek profil & saldo Reseller
apiV1Router.post('/profile', async (c) => {
  const user = c.get('api_user')
  return c.json({
    status: true,
    data: { username: user.username, balance: user.balance }
  })
})

// Endpoint untuk menarik daftar layanan
apiV1Router.post('/services', async (c) => {
  const services = await c.env.DB.prepare(`
    SELECT id as service_id, name, type, (rate + margin) as price, min_order, max_order, is_refill, is_cancel 
    FROM services WHERE status = 'active'
  `).all()
  
  return c.json({ status: true, data: services.results })
})

// Daftarkan Router Pesanan
apiV1Router.route('/orders', v1OrdersRouter)
