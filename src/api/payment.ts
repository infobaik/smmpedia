// src/api/payment.ts
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import type { Bindings } from '../index'

export const paymentRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// DEPOSIT TRIGGER (MENGIRIM DATA KE GATEWAY)
// =========================================================
paymentRouter.post('/deposit', async (c) => {
  // 1. Ekstrak Token dengan Aman
  const token = getCookie(c, 'user_token')
  if (!token) return c.json({ error: 'Sesi tidak valid.' }, 401)

  let userId = null;
  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256')
    userId = decoded.userId
  } catch (e) {
    return c.json({ error: 'Sesi kedaluwarsa.' }, 401)
  }

  // 2. Parse dan Validasi Nominal
  let amount = 0;
  try {
    const body = await c.req.json()
    amount = parseInt(String(body.amount), 10)
  } catch (e) {
    return c.json({ error: 'Format JSON rusak.' }, 400)
  }

  if (isNaN(amount) || amount < 10000) {
    return c.json({ error: 'Nominal deposit minimal Rp 10.000.' }, 400)
  }

  // 3. Ambil data user dari Database
  const user = await c.env.DB.prepare('SELECT email, name, whatsapp FROM users WHERE id = ?1').bind(userId).first()
  if (!user) return c.json({ error: 'Pengguna tidak ditemukan di database.' }, 404)

  // 4. Ambil config gateway dari Database Admin
  const gateway = await c.env.DB.prepare("SELECT api_url, api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway || !gateway.api_url || !gateway.api_key) {
    return c.json({ error: 'Payment Gateway belum dikonfigurasi oleh Admin di menu Pengaturan.' }, 500)
  }

  // 5. Normalisasi URL
  const apiUrl = String(gateway.api_url).trim().replace(/\/+$/, '')
  const deposit_id = 'DEP-' + crypto.randomUUID().substring(0, 8).toUpperCase()
  
  // 6. Format Payload sesuai instruksi (Kosongkan jika tidak ada, jangan diisi dummy)
  const payload = {
    order_id: deposit_id, 
    amount: amount,
    link_name: '', // Dikosongkan sesuai instruksi
    customer: {
      name: user.name ? String(user.name).trim() : '',
      wa: user.whatsapp ? String(user.whatsapp).trim() : '',
      email: user.email ? String(user.email).trim() : ''
    }
  }

  // 7. Eksekusi Request ke Gateway
  try {
    const response = await fetch(`${apiUrl}/trx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SMMPanel-System/1.0'
      },
      body: JSON.stringify(payload)
    })

    const textResult = await response.text()
    let result;
    try {
      result = JSON.parse(textResult)
    } catch (e) {
      return c.json({ error: 'Gateway merespons dengan format non-JSON.', details: textResult }, 502)
    }

    if (response.ok && result.payment_url) {
      await c.env.DB.prepare(`
        INSERT INTO deposits (id, user_id, amount, status, payment_link)
        VALUES (?1, ?2, ?3, 'pending', ?4)
      `).bind(deposit_id, userId, amount, result.payment_url).run()

      return c.json({ success: true, deposit_id, payment_url: result.payment_url })
    }
    
    return c.json({ 
      error: 'Ditolak oleh Server Gateway.', 
      gateway_response: result 
    }, 400)

  } catch (error: any) {
    return c.json({ error: 'Gagal menghubungi server gateway.', details: error.message }, 500)
  }
})

// =========================================================
// WEBHOOK RECEIVER (VALIDASI HMAC DENGAN API KEY)
// =========================================================
paymentRouter.post('/webhook', async (c) => {
  const gateway = await c.env.DB.prepare("SELECT api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway || !gateway.api_key) return c.json({ error: 'Gateway tidak terkonfigurasi' }, 500)

  const rawBody = await c.req.text()
  const signatureHeader = c.req.header('X-Signature')
  if (!signatureHeader) return c.json({ error: 'Header X-Signature hilang' }, 403)

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(gateway.api_key as string),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (calculatedSignature !== signatureHeader) {
    return c.json({ error: 'Tanda tangan Webhook tidak sah' }, 403)
  }

  try {
    const decodedPayload = JSON.parse(rawBody)
    const { order_id, status } = decodedPayload 

    if (status === 'PAID') {
      const deposit = await c.env.DB.prepare('SELECT * FROM deposits WHERE id = ?1 AND status = "pending"').bind(order_id).first()
      if (deposit) {
        await c.env.DB.batch([
          c.env.DB.prepare('UPDATE deposits SET status = "paid" WHERE id = ?1').bind(order_id),
          c.env.DB.prepare('UPDATE users SET balance = balance + ?1 WHERE id = ?2').bind(deposit.amount, deposit.user_id)
        ])
      }
    }
    return c.json({ success: true, message: 'Webhook sukses divalidasi dan diproses' })
  } catch (e) {
    return c.json({ error: 'Payload bukan JSON yang valid' }, 400)
  }
})
