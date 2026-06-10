import { Hono } from 'hono'
import type { Bindings } from '../index'

export const paymentRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// DEPOSIT TRIGGER (MENGIRIM DATA KE GATEWAY)
// =========================================================
paymentRouter.post('/deposit', async (c) => {
  const userSession = c.get('user')
  const { amount } = await c.req.json()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(userSession.userId).first()
  if (!user || !user.name || !user.whatsapp) {
    return c.json({ error: 'Harap lengkapi Nama dan WhatsApp di profil sebelum melakukan deposit.' }, 400)
  }

  // Mengambil konfigurasi murni dari DATABASE (Bukan KV)
  const gateway = await c.env.DB.prepare("SELECT api_url, api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway || !gateway.api_url || !gateway.api_key) {
    return c.json({ error: 'Sistem Payment Gateway belum dikonfigurasi oleh Admin.' }, 500)
  }

  const deposit_id = 'DEP-' + crypto.randomUUID().substring(0, 8).toUpperCase()
  
  const payload = {
    order_id: deposit_id, 
    amount: parseInt(amount),
    link_name: 'Deposit Saldo SMM',
    customer: {
      name: user.name,
      wa: user.whatsapp,
      email: user.email
    }
  }

  try {
    const response = await fetch(`${gateway.api_url}/trx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (response.ok && result.payment_url) {
      await c.env.DB.prepare(`
        INSERT INTO deposits (id, user_id, amount, status, payment_link)
        VALUES (?1, ?2, ?3, 'pending', ?4)
      `).bind(deposit_id, user.id, amount, result.payment_url).run()

      return c.json({ success: true, deposit_id, payment_url: result.payment_url })
    }
    return c.json({ error: 'Gateway menolak transaksi.', details: result }, 400)
  } catch (error) {
    return c.json({ error: 'Gagal menghubungi server gateway.' }, 500)
  }
})

// =========================================================
// WEBHOOK RECEIVER (VALIDASI HMAC DENGAN API KEY)
// =========================================================
paymentRouter.post('/webhook', async (c) => {
  const gateway = await c.env.DB.prepare("SELECT api_key FROM gateway_settings WHERE id = 'qris'").first()
  if (!gateway || !gateway.api_key) return c.json({ error: 'Not configured' }, 500)

  const rawBody = await c.req.text()
  const signatureHeader = c.req.header('X-Signature')
  if (!signatureHeader) return c.json({ error: 'Missing Signature' }, 403)

  // Validasi HMAC SHA-256 menggunakan API KEY yang SAMA
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(gateway.api_key as string),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  if (calculatedSignature !== signatureHeader) {
    return c.json({ error: 'Invalid Webhook Signature' }, 403)
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
    return c.json({ success: true, message: 'Webhook processed' })
  } catch (e) {
    return c.json({ error: 'Invalid Payload' }, 400)
  }
})
