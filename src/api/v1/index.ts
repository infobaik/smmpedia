// src/api/v1/index.ts
import { Hono } from 'hono'
import type { Bindings } from '../../index'
import { fetchBuzzerPanel } from '../buzzerpanel'

export const apiV1Router = new Hono<{ Bindings: Bindings }>()

// Helper untuk format API Custom Provider
function buildPayload(templateStr: string, data: Record<string, any>) {
  let parsedStr = templateStr;
  for (const [key, value] of Object.entries(data)) {
    parsedStr = parsedStr.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return JSON.parse(parsedStr);
}

// Handler Inti API SMM Standard
const apiHandler = async (c: any) => {
  try {
    // 1. Dukung format pengiriman JSON maupun Form URL-Encoded dari PHP cURL
    let body: any = {}
    const contentType = c.req.header('Content-Type') || ''
    
    if (contentType.includes('application/json')) {
      body = await c.req.json()
    } else {
      body = await c.req.parseBody()
    }

    // 2. Autentikasi API Key 
    const apiKey = body.key || c.req.header('x-api-key')
    if (!apiKey) return c.json({ error: "Autentikasi gagal: Parameter 'key' diperlukan." }, 401)

    // BUG FIXED: Hapus pemanggilan kolom 'status' karena tidak ada di schema.sql tabel users
    const user = await c.env.DB.prepare('SELECT id, balance FROM users WHERE api_key = ?1').bind(apiKey).first()
    if (!user) return c.json({ error: "Autentikasi gagal: API Key tidak valid." }, 401)

    const action = body.action

    // ==========================================
    // ACTION: Cek Saldo
    // ==========================================
    if (action === 'balance') {
      return c.json({ 
        balance: user.balance, 
        currency: "IDR" 
      })
    }

    // ==========================================
    // ACTION: Tarik Layanan (MURNI DARI LOKAL)
    // ==========================================
    if (action === 'services') {
      const servicesData = await c.env.DB.prepare(`
        SELECT s.id as service, s.name, c.name as category, s.type, (s.rate + s.margin) as rate, s.min_order as min, s.max_order as max, s.is_refill as refill, s.is_cancel as cancel, s.is_dripfeed as dripfeed
        FROM services s 
        JOIN categories c ON s.category_id = c.id
        WHERE s.status = 'active'
      `).all()
      
      const formattedServices = servicesData.results?.map((s: any) => ({
        service: s.service,
        name: s.name,
        category: s.category,
        type: s.type,
        rate: s.rate,
        min: s.min,
        max: s.max,
        refill: s.refill === 1,
        cancel: s.cancel === 1,
        dripfeed: s.dripfeed === 1
      })) || []

      return c.json(formattedServices)
    }

    // ==========================================
    // ACTION: Cek Status Pesanan (MURNI DARI LOKAL)
    // ==========================================
    if (action === 'status') {
      const orderId = body.order
      if (!orderId) return c.json({ error: "Parameter 'order' (ID Pesanan) diperlukan." })

      const order = await c.env.DB.prepare(`
        SELECT charge, status, provider_order_id, quantity 
        FROM orders WHERE id = ?1 AND user_id = ?2
      `).bind(orderId, user.id).first()

      if (!order) return c.json({ error: "Pesanan tidak ditemukan atau bukan milik Anda." })

      return c.json({
        charge: order.charge,
        start_count: 0,
        status: order.status, 
        remains: 0,
        currency: "IDR"
      })
    }

    // ==========================================
    // ACTION: Transaksi Pesanan Baru 
    // ==========================================
    if (action === 'add') {
      const { service, link, quantity } = body
      if (!service || !link || !quantity) {
        return c.json({ error: "Parameter service, link, dan quantity wajib diisi." })
      }

      const srv = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?1 AND status = "active"').bind(service).first()
      if (!srv) return c.json({ error: "Layanan tidak valid atau sedang offline." })

      const qtyNum = parseInt(quantity)
      if (qtyNum < srv.min_order || qtyNum > srv.max_order) {
        return c.json({ error: `Jumlah pesanan harus antara ${srv.min_order} - ${srv.max_order}.` })
      }

      const charge = (Number(srv.rate) + Number(srv.margin || 0)) * (qtyNum / 1000)

      const deductResult = await c.env.DB.prepare(`
        UPDATE users SET balance = balance - ?1 WHERE id = ?2 AND balance >= ?1
      `).bind(charge, user.id).run()

      if (deductResult.meta.changes === 0) return c.json({ error: "Saldo tidak mencukupi untuk melakukan pesanan ini." })

      const localOrderId = crypto.randomUUID()
      await c.env.DB.prepare(`
        INSERT INTO orders (id, user_id, service_id, link, quantity, charge, status)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'processing')
      `).bind(localOrderId, user.id, service, link, qtyNum, charge).run()

      let providerOrderIdStr = null;
      let providerErrorMessage = null;
      let isNetworkError = false;

      if (srv.provider_slug === 'buzzerpanel') {
        try {
          // AMBIL KREDENSIAL DARI DATABASE
          const providerData = await c.env.DB.prepare('SELECT api_key, secret_key FROM providers WHERE slug = "buzzerpanel"').first()
          
          const providerResponse = await fetchBuzzerPanel(providerData?.api_key as string || '', providerData?.secret_key as string || '', 'order', {
            service: srv.product_provider_id, link: link, quantity: qtyNum
          })
          
          if (providerResponse.status === false || providerResponse.error) providerErrorMessage = providerResponse.data || providerResponse.error || "Gagal memproses pesanan."
          else if (providerResponse.data && providerResponse.data.id) providerOrderIdStr = providerResponse.data.id.toString()
          else isNetworkError = true
        } catch (e) {
          isNetworkError = true
        }
      } else {
        const customProvider = await c.env.DB.prepare('SELECT * FROM providers WHERE slug = ?1 AND status = "active"').bind(srv.provider_slug).first()
        if (customProvider) {
          try {
            // Meneruskan api_key dan secret_key ke Custom Provider dari Database
            const payload = buildPayload(customProvider.order_body_template as string, { 
              link, 
              quantity: qtyNum, 
              product_provider_id: srv.product_provider_id,
              api_key: customProvider.api_key || '',
              secret_key: customProvider.secret_key || ''
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

            const response = await fetch(customProvider.base_url as string, { method: customProvider.request_method as string, headers, body: bodyData })
            const customResult = await response.json()
            const mapping = JSON.parse(customProvider.response_mapping as string)
            
            if (customResult[mapping.order_id_key]) providerOrderIdStr = customResult[mapping.order_id_key].toString()
            else providerErrorMessage = customResult[mapping.error_key] || "Ditolak Pusat."
          } catch (e) {
            isNetworkError = true
          }
        } else {
          providerErrorMessage = "Koneksi Provider Offline."
        }
      }

      if (providerErrorMessage) {
        await c.env.DB.batch([
          c.env.DB.prepare(`UPDATE users SET balance = balance + ?1 WHERE id = ?2`).bind(charge, user.id),
          c.env.DB.prepare(`UPDATE orders SET status = 'canceled' WHERE id = ?1`).bind(localOrderId)
        ])
        return c.json({ error: `Gagal meneruskan ke pusat: ${providerErrorMessage}. Saldo otomatis di-refund.` })
      }

      if (isNetworkError) {
        await c.env.DB.prepare(`UPDATE orders SET status = 'manual_reconciliation' WHERE id = ?1`).bind(localOrderId).run()
        return c.json({ order: localOrderId })
      }

      await c.env.DB.prepare(`UPDATE orders SET status = 'pending', provider_order_id = ?1 WHERE id = ?2`).bind(providerOrderIdStr, localOrderId).run()
      return c.json({ order: localOrderId })
    }

    return c.json({ error: "Parameter 'action' tidak dikenali sistem." })
  } catch (err: any) {
    return c.json({ error: "Terjadi kesalahan internal server." }, 500)
  }
}

// FIX UTAMA: Tangkap semua variasi penulisan URL agar tidak bocor ke 404 Frontend
apiV1Router.post('', apiHandler)     // Menangkap: /api/v1
apiV1Router.post('/', apiHandler)    // Menangkap: /api/v1/
apiV1Router.post('/*', apiHandler)   // Menangkap sub-rute tambahan jika ada
