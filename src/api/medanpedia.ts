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
    // 1. Tarik Data Layanan dari Pusat
    const services = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'services')
    if (!Array.isArray(services)) return c.json({ error: 'Format respons tidak valid' }, 400)

    // 2. Pastikan Provider "medanpedia" terdaftar agar tidak melanggar Foreign Key
    await c.env.DB.prepare(`
      INSERT INTO providers (slug, name, type, base_url, status)
      VALUES ('medanpedia', 'Medanpedia API', 'native', 'https://medanpedia.com/api/v2', 'active')
      ON CONFLICT(slug) DO NOTHING
    `).run()

    // 3. Ekstrak Kategori Unik dari respons API Pusat
    const uniqueCategories = [...new Set(services.map((s: any) => s.category))]

    // 4. Masukkan Kategori Baru ke Tabel categories (Abaikan jika sudah ada)
    const catInsertStmts = uniqueCategories.map(catName => {
      const catId = `cat_${crypto.randomUUID().substring(0, 8)}`
      return c.env.DB.prepare(`
        INSERT INTO categories (id, name, description)
        VALUES (?1, ?2, '')
        ON CONFLICT(name) DO NOTHING
      `).bind(catId, catName)
    })
    
    if (catInsertStmts.length > 0) {
      // Chunking untuk menghindari batas maksimal D1 batch
      for (let i = 0; i < catInsertStmts.length; i += 50) {
        await c.env.DB.batch(catInsertStmts.slice(i, i + 50))
      }
    }

    // 5. Ambil Kamus Kategori (Map) untuk mencocokkan Nama dengan ID Kategori
    const categoriesDB = await c.env.DB.prepare('SELECT id, name FROM categories').all()
    const categoryMap = new Map()
    categoriesDB.results?.forEach((row: any) => {
      categoryMap.set(row.name, row.id)
    })

    // 6. Siapkan Kueri Utama untuk Produk
    const stmt = c.env.DB.prepare(`
      INSERT INTO services (id, category_id, provider_slug, product_provider_id, name, type, rate, margin, min_order, max_order, status)
      VALUES (?1, ?2, 'medanpedia', ?3, ?4, ?5, ?6, 0.0, ?7, ?8, 'active')
      ON CONFLICT(id) DO UPDATE SET 
        category_id = excluded.category_id,
        rate = excluded.rate, 
        name = excluded.name,
        min_order = excluded.min_order,
        max_order = excluded.max_order,
        status = 'active'
    `)

    // 7. Rangkai Data sesuai skema baru
    const batchStmts = services.map((item: any) => {
      const localId = `md_${item.service}` 
      const catId = categoryMap.get(item.category)
      
      return stmt.bind(
        localId, 
        catId, // Menggunakan FK category_id yang valid
        String(item.service), // Masuk ke product_provider_id
        item.name, 
        item.type, 
        parseFloat(item.rate), 
        parseInt(item.min), 
        parseInt(item.max)
      )
    })

    // 8. Eksekusi Batch dengan Chunking (Pecah per 100 data)
    // Ini krusial karena D1 akan error jika kita mengirim ribuan batch statement sekaligus
    const chunkSize = 100
    for (let i = 0; i < batchStmts.length; i += chunkSize) {
      await c.env.DB.batch(batchStmts.slice(i, i + chunkSize))
    }

    return c.json({ success: true, message: `${batchStmts.length} layanan berhasil disinkronkan ke dalam database.` })
  } catch (error: any) {
    return c.json({ error: 'Terjadi kesalahan sistem internal: ' + error.message }, 500)
  }
})
