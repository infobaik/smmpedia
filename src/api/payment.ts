import { Hono } from 'hono'
import type { Bindings } from '../index'

export const paymentRouter = new Hono<{ Bindings: Bindings }>()

paymentRouter.post('/deposit', async (c) => {
  const userSession = c.get('user')
  const { amount } = await c.req.json()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(userSession.userId).first()
  if (!user || !user.name || !user.whatsapp) {
    return c.json({ error: 'Harap lengkapi Nama dan WhatsApp di profil.' }, 400)
  }

  const kvConfigRaw = await c.env.CONFIG_KV.get('GATEWAY_SETTINGS')
  if (!kvConfigRaw) return c.json({ error: 'Gateway belum dikonfigurasi.' }, 500)
  const config = JSON.parse(kvConfigRaw)

  // Menggunakan deposit_id sebagai identitas unik transaksi
  const deposit_id = 'DEP-' + crypto.randomUUID().substring(0, 8).toUpperCase()
  
  const payload = {
    order_id: deposit_id, // Gateway akan menerima ini sebagai identifier
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
    return c.json({ error: 'Gateway menolak deposit.', details: result }, 400)
  } catch (error) {
    return c.json({ error: 'Gagal koneksi ke gateway.' }, 500)
  }
})

// Webhook Receiver
paymentRouter.post('/webhook', async (c) => {
  const rawBody = await c.req.text()
  const signatureHeader = c.req.header('X-Signature')
  
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

  // 4. Validasi Kecocokan (Sama seperti hash_equals di PHP)
  if (calculatedSignature !== signatureHeader) {
    return c.json({ error: 'Invalid Webhook Signature' }, 403)
  }

  const decodedPayload = JSON.parse(rawBody)
  // Memetakan order_id dari gateway ke deposit_id lokal kita
  const { order_id, status } = decodedPayload 

  if (status === 'PAID') {
    const deposit = await c.env.DB.prepare('SELECT * FROM deposits WHERE id = ?1 AND status = "pending"').bind(order_id).first()
    
    if (deposit) {
      await c.env.DB.prepare('UPDATE deposits SET status = "paid" WHERE id = ?1').bind(order_id).run()
      await c.env.DB.prepare('UPDATE users SET balance = balance + ?1 WHERE id = ?2')
        .bind(deposit.amount, deposit.user_id).run()
    }
  }

  return c.json({ success: true })
})
