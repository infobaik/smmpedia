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
  let token = getCookie(c, 'user_token')
  if (!token) {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
  }

  if (!token) return c.json({ error: 'Sesi tidak valid.' }, 401)

  let userId = null;
  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256')
    userId = decoded.userId
  } catch (e) {
    return c.json({ error: 'Sesi kedaluwarsa.' }, 401)
  }

  let amount = 0;
  try {
    const body = await c.req.json()
    amount = parseInt(String(body.amount), 10)
  } catch (e) {
    return c.json({ error: 'Format JSON rusak.' }, 400)
  }

  if (isNaN(amount) || amount < 10000) return c.json({ error: 'Nominal deposit minimal Rp 10.000.' }, 400)

  const user = await c.env.DB.prepare('SELECT email, name, whatsapp FROM users WHERE id = ?1').bind(userId).first()
  if (!user) return c.json({ error: 'Pengguna tidak ditemukan.' }, 404)

  const gateway = await c.env.DB.prepare("SELECT api_url, api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway || !gateway.api_url || !gateway.api_key) {
    return c.json({ error: 'Payment Gateway belum dikonfigurasi.' }, 500)
  }

  const apiUrl = String(gateway.api_url).trim().replace(/\/+$/, '')
  const deposit_id = 'DEP-' + crypto.randomUUID().substring(0, 8).toUpperCase()
  
  // Deteksi domain secara otomatis
  const currentDomain = new URL(c.req.url).origin

  const payload = {
    order_id: deposit_id, 
    amount: amount,
    webhook_url: `${currentDomain}/api/payment/webhook`,
    redirect_url: `${currentDomain}/wallet`,
    link_name: '',
    customer: {
      name: user.name ? String(user.name).trim() : '',
      wa: user.whatsapp ? String(user.whatsapp).trim() : '',
      email: user.email ? String(user.email).trim() : ''
    }
  }

  try {
    const response = await fetch(`${apiUrl}/trx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SMMPanel/1.0'
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

    if (response.ok && result.status === 'success') {
      const qrUrl = result.raw_qris ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.raw_qris)}` : '';

      await c.env.DB.prepare(`
        INSERT INTO deposits (id, user_id, amount, status, payment_link)
        VALUES (?1, ?2, ?3, 'pending', ?4)
      `).bind(deposit_id, userId, amount, result.paylink).run()

      return c.json({ 
        success: true, 
        deposit_id, 
        payment_url: result.paylink, // <- Proteksi mutlak agar tidak bernilai undefined
        paylink: result.paylink,
        qr_url: qrUrl,
        raw_qris: result.raw_qris || ''
      })
    }
    
    return c.json({ error: 'Gateway menolak payload.', gateway_response: result, payload_sent: payload }, 400)

  } catch (error: any) {
    return c.json({ error: 'Gagal menghubungi server gateway.', details: error.message }, 500)
  }
})

// =========================================================
// WEBHOOK RECEIVER
// =========================================================
paymentRouter.post('/webhook', async (c) => {
  const gateway = await c.env.DB.prepare("SELECT api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway) return c.json({ error: 'Gateway not configured' }, 500)

  const rawBody = await c.req.text()
  console.log("DEBUG WEBHOOK - RAW BODY:", rawBody); // LIHAT INI DI LOGS

  const signatureHeader = c.req.header('X-Signature') || c.req.header('x-signature')
  
  // (Tetap gunakan logika HMAC yang lama)
  // ... 

  try {
    const decodedPayload = JSON.parse(rawBody)
    const order_id = decodedPayload.order_id
    const status = String(decodedPayload.status).toUpperCase()

    console.log(`DEBUG WEBHOOK - Processing Order: ${order_id}, Status: ${status}`);

    // CEK APAKAH DATA ADA DI DB
    const deposit = await c.env.DB.prepare('SELECT * FROM deposits WHERE id = ?1').bind(order_id).first()
    console.log("DEBUG WEBHOOK - Found in DB:", deposit);

    if (!deposit) {
       console.log("DEBUG ERROR: Order ID tidak ditemukan di database.");
       return c.json({ error: 'Order ID not found' }, 404);
    }

    if (status === 'PAID' || status === 'SUCCESS') {
      if (deposit.status === 'paid') {
        console.log("DEBUG: Deposit sudah lunas sebelumnya.");
        return c.json({ message: 'Already processed' });
      }

      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE deposits SET status = "paid" WHERE id = ?1').bind(order_id),
        c.env.DB.prepare('UPDATE users SET balance = balance + ?1 WHERE id = ?2').bind(deposit.amount, deposit.user_id)
      ])
      console.log("DEBUG SUCCESS: Status diperbarui & Saldo ditambah.");
      return c.json({ success: true })
    }
    
    return c.json({ success: true, message: 'Status ignored' })
  } catch (e) {
    console.error("DEBUG CRITICAL ERROR:", e);
    return c.json({ error: 'Payload error' }, 400)
  }
})
