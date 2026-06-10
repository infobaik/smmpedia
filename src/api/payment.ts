// src/api/payment.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const paymentRouter = new Hono<{ Bindings: Bindings }>()

// =========================================================
// DEPOSIT TRIGGER (MENGIRIM DATA KE GATEWAY)
// =========================================================
paymentRouter.post('/deposit', async (c) => {
  const userSession = c.get('user')
  const { amount } = await c.req.json()

  // Ambil profil lengkap dari DB
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(userSession.userId).first()
  if (!user || !user.name || !user.whatsapp) {
    return c.json({ error: 'Harap lengkapi Nama dan WhatsApp di profil sebelum melakukan deposit.' }, 400)
  }

  // Ambil konfigurasi dari KV
  const kvConfigRaw = await c.env.CONFIG_KV.get('GATEWAY_SETTINGS')
  if (!kvConfigRaw) return c.json({ error: 'Gateway belum dikonfigurasi.' }, 500)
  const config = JSON.parse(kvConfigRaw)

  // Buat deposit_id unik
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
    const response = await fetch(`${config.qrisApiUrl}/trx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.qrisApiKey}`,
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
    return c.json({ error: 'Gagal menghubungi gateway.' }, 500)
  }
})

// =========================================================
// WEBHOOK RECEIVER (VALIDASI HMAC SHA-256)
// =========================================================
paymentRouter.post('/webhook', async (c) => {
  // 1. Ambil config
  const kvConfigRaw = await c.env.CONFIG_KV.get('GATEWAY_SETTINGS')
  if (!kvConfigRaw) return c.json({ error: 'Not configured' }, 500)
  const config = JSON.parse(kvConfigRaw)

  // 2. Ambil raw body dan signature
  const rawBody = await c.req.text()
  const signatureHeader = c.req.header('X-Signature')
  if (!signatureHeader) return c.json({ error: 'Missing Signature' }, 403)

  // 3. Validasi HMAC SHA-256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.qrisWebhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  if (calculatedSignature !== signatureHeader) {
    return c.json({ error: 'Invalid Signature' }, 403)
  }

  // 4. Proses Payload
  try {
    const decodedPayload = JSON.parse(rawBody)
    const { order_id, status } = decodedPayload // order_id dari gateway adalah deposit_id kita

    if (status === 'PAID') {
      const deposit = await c.env.DB.prepare('SELECT * FROM deposits WHERE id = ?1 AND status = "pending"').bind(order_id).first()
      
      if (deposit) {
        // Eksekusi atomik: Update status deposit DAN tambah saldo user
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
