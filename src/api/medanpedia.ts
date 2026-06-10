// src/api/medanpedia.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const medanpediaRouter = new Hono<{ Bindings: Bindings }>()
const MEDANPEDIA_URL = 'https://medanpedia.com/api/v2'

export async function fetchMedanpedia(apiKey: string, action: string, data: Record<string, any> = {}) {
  const body = new URLSearchParams()
  body.append('key', apiKey)
  body.append('action', action)
  for (const [k, v] of Object.entries(data)) { body.append(k, String(v)) }

  const response = await fetch(MEDANPEDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  return response.json()
}

medanpediaRouter.post('/sync-services', async (c) => {
  try {
    // 1. Tarik Data Layanan dari Pusat API
    const services = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'services')
    if (!Array.isArray(services)) return c.json({ error: 'Format respons tidak valid' }, 400)

    // 2. Pastikan Provider "medanpedia" terdaftar
    await c.env.DB.prepare(`
      INSERT INTO providers (slug, name, type, base_url, status)
      VALUES ('medanpedia', 'Medanpedia API', 'native', 'https://medanpedia.com/api/v2', 'active')
      ON CONFLICT(slug) DO NOTHING
    `).run()

    // 3. Masukkan Kategori Baru (Sangat hemat D1 Write karena pakai DO NOTHING)
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
      for (let i = 0; i < catInsertStmts.length; i += 50) {
        await c.env.DB.batch(catInsertStmts.slice(i, i + 50))
      }
    }

    // 4. Ambil Data Kategori & Layanan Lokal untuk Pencocokan Memori (Hanya Read = Sangat Murah)
    const [categoriesDB, localServicesDB] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT id, name FROM categories'),
      c.env.DB.prepare('SELECT id, rate, margin, name, min_order, max_order, is_refill, is_cancel, is_dripfeed, status FROM services WHERE provider_slug = "medanpedia"')
    ])

    const categoryMap = new Map()
    categoriesDB.results?.forEach((row: any) => categoryMap.set(row.name, row.id))

    // Map layanan lokal untuk Diffing / Perbandingan data
    const localServices = new Map()
    localServicesDB.results?.forEach((row: any) => localServices.set(row.id, row))

    // 5. Ambil Setting Markup Profit dari KV (1x Read saja)
    let markupPercent = 0;
    try {
      const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS');
      if (kvConfigRaw) {
        markupPercent = JSON.parse(kvConfigRaw).profitMarginPercent || 0;
      }
    } catch (e) {}

    // 6. Siapkan Query UPSERT
    const stmt = c.env.DB.prepare(`
      INSERT INTO services (
        id, category_id, provider_slug, product_provider_id, name, type, 
        rate, margin, min_order, max_order, is_refill, is_cancel, is_dripfeed, status
      )
      VALUES (?1, ?2, 'medanpedia', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'active')
      ON CONFLICT(id) DO UPDATE SET 
        category_id = excluded.category_id,
        rate = excluded.rate,
        margin = excluded.margin,
        name = excluded.name,
        min_order = excluded.min_order,
        max_order = excluded.max_order,
        is_refill = excluded.is_refill,
        is_cancel = excluded.is_cancel,
        is_dripfeed = excluded.is_dripfeed,
        status = 'active'
    `)

    // 7. Proses In-Memory Diffing: Tentukan mana yang perlu di-Write ke D1
    const batchStmts: any[] = []
    let skippedCount = 0

    services.forEach((item: any) => {
      const localId = `md_${item.service}` 
      const catId = categoryMap.get(item.category)
      
      const baseRate = parseFloat(item.rate)
      const calculatedMargin = baseRate * (markupPercent / 100)
      
      const minOrder = parseInt(item.min)
      const maxOrder = parseInt(item.max)
      const isRefill = item.refill ? 1 : 0
      const isCancel = item.cancel ? 1 : 0
      const isDripfeed = item.dripfeed ? 1 : 0

      // PROTEKSI KUOTA D1 WRITE: Cek apakah data benar-benar berubah?
      const existing = localServices.get(localId)
      if (existing) {
        if (
          existing.rate === baseRate &&
          existing.margin === calculatedMargin &&
          existing.name === item.name &&
          existing.min_order === minOrder &&
          existing.max_order === maxOrder &&
          existing.is_refill === isRefill &&
          existing.is_cancel === isCancel &&
          existing.is_dripfeed === isDripfeed &&
          existing.status === 'active'
        ) {
          skippedCount++
          return // Lewati layanan ini, jangan buat query D1 Write!
        }
      }
      
      // Jika harga/nama berubah atau produk baru, tambahkan ke kueri Batch
      batchStmts.push(stmt.bind(
        localId, catId, String(item.service), item.name, item.type, 
        baseRate, calculatedMargin, minOrder, maxOrder,
        isRefill, isCancel, isDripfeed
      ))
    })

    // 8. Eksekusi Tulis (Write) HANYA untuk data yang berubah
    if (batchStmts.length > 0) {
      const chunkSize = 100
      for (let i = 0; i < batchStmts.length; i += chunkSize) {
        await c.env.DB.batch(batchStmts.slice(i, i + chunkSize))
      }
    }

    return c.json({ 
      success: true, 
      message: `Tersinkron: ${batchStmts.length} layanan baru/diperbarui. Menghemat Kuota: ${skippedCount} layanan diabaikan karena tidak ada perubahan.` 
    })
    
  } catch (error: any) {
    return c.json({ error: 'Terjadi kesalahan sistem internal: ' + error.message }, 500)
  }
})
