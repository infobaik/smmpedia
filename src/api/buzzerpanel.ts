// src/api/buzzerpanel.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const buzzerpanelRouter = new Hono<{ Bindings: Bindings }>()
const BUZZERPANEL_URL = 'https://buzzerpanel.id/api/json.php'

export async function fetchBuzzerPanel(apiKey: string, secretKey: string, action: string, data: Record<string, any> = {}) {
  const body = new URLSearchParams()
  body.append('api_key', apiKey || '')
  body.append('secret_key', secretKey || '')
  body.append('action', action)
  for (const [k, v] of Object.entries(data)) { body.append(k, String(v)) }

  const response = await fetch(BUZZERPANEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  return response.json()
}

buzzerpanelRouter.post('/sync-services', async (c) => {
  try {
    const providerData = await c.env.DB.prepare('SELECT api_key, secret_key FROM providers WHERE slug = "buzzerpanel"').first()
    const apiKey = providerData?.api_key || ''
    const secretKey = providerData?.secret_key || ''

    if (!apiKey || !secretKey) {
        return c.json({ error: 'API Key dan Secret Key BuzzerPanel belum diisi di menu Admin > Provider API.' }, 400)
    }

    const result = await fetchBuzzerPanel(apiKey as string, secretKey as string, 'services')
    const services = result.data || result // Buzzerpanel bisa merespon array langsung atau dibungkus objek .data
    
    if (!Array.isArray(services)) return c.json({ error: 'Format respons dari pusat tidak valid atau API Key salah.' }, 400)

    // Pastikan provider buzzerpanel terdaftar
    await c.env.DB.prepare(`
      INSERT INTO providers (slug, name, type, base_url, api_key, secret_key, status)
      VALUES ('buzzerpanel', 'BuzzerPanel API', 'native', 'https://buzzerpanel.id/api/json.php', ?1, ?2, 'active')
      ON CONFLICT(slug) DO NOTHING
    `).bind(apiKey, secretKey).run()

    // Masukkan Kategori Baru
    const uniqueCategories = [...new Set(services.map((s: any) => s.category))]
    const catInsertStmts = uniqueCategories.map(catName => {
      const catId = `cat_${crypto.randomUUID().substring(0, 8)}`
      return c.env.DB.prepare(`
        INSERT INTO categories (id, name, description)
        VALUES (?1, ?2, '')
        ON CONFLICT(name) DO NOTHING
      `).bind(catId, catName)
    })
    
    if (catInsertStmts.length > 0) {
      for (let i = 0; i < catInsertStmts.length; i += 50) await c.env.DB.batch(catInsertStmts.slice(i, i + 50))
    }

    // Pemetaan ID Kategori dan Layanan Lokal
    const [categoriesDB, localServicesDB] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT id, name FROM categories'),
      c.env.DB.prepare('SELECT id, rate, margin, name, min_order, max_order, is_refill, is_cancel, is_dripfeed, status FROM services WHERE provider_slug = "buzzerpanel"')
    ])

    const categoryMap = new Map()
    categoriesDB.results?.forEach((row: any) => categoryMap.set(row.name, row.id))

    const localServices = new Map()
    localServicesDB.results?.forEach((row: any) => localServices.set(row.id, row))

    let markupPercent = 0;
    try {
      const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS');
      if (kvConfigRaw) markupPercent = JSON.parse(kvConfigRaw).profitMarginPercent || 0;
    } catch (e) {}

    const stmt = c.env.DB.prepare(`
      INSERT INTO services (
        id, category_id, provider_slug, product_provider_id, name, type, 
        rate, margin, min_order, max_order, is_refill, is_cancel, is_dripfeed, status
      )
      VALUES (?1, ?2, 'buzzerpanel', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'active')
      ON CONFLICT(id) DO UPDATE SET 
        category_id = excluded.category_id, rate = excluded.rate, margin = excluded.margin,
        name = excluded.name, min_order = excluded.min_order, max_order = excluded.max_order,
        is_refill = excluded.is_refill, is_cancel = excluded.is_cancel, is_dripfeed = excluded.is_dripfeed, status = 'active'
    `)

    const batchStmts: any[] = []
    let skippedCount = 0

    services.forEach((item: any) => {
      const serviceId = item.id || item.service
      const localId = `bp_${serviceId}`
      const catId = categoryMap.get(item.category)
      
      const baseRate = parseFloat(item.price || item.rate)
      const calculatedMargin = baseRate * (markupPercent / 100)
      const minOrder = parseInt(item.min)
      const maxOrder = parseInt(item.max)
      const isRefill = item.refill ? 1 : 0
      const isCancel = item.cancel ? 1 : 0
      const isDripfeed = item.dripfeed ? 1 : 0

      const existing = localServices.get(localId)
      if (existing && existing.rate === baseRate && existing.margin === calculatedMargin && existing.name === item.name && existing.status === 'active') {
        skippedCount++
        return 
      }
      
      batchStmts.push(stmt.bind(localId, catId, String(serviceId), item.name, item.type || 'Default', baseRate, calculatedMargin, minOrder, maxOrder, isRefill, isCancel, isDripfeed))
    })

    if (batchStmts.length > 0) {
      for (let i = 0; i < batchStmts.length; i += 100) await c.env.DB.batch(batchStmts.slice(i, i + 100))
    }

    return c.json({ success: true, message: `Tersinkron: ${batchStmts.length} layanan diperbarui. Diabaikan: ${skippedCount}.` })
  } catch (error: any) {
    return c.json({ error: 'Kesalahan internal: ' + error.message }, 500)
  }
})
