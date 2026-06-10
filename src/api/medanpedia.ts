// src/api/medanpedia.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const medanpediaRouter = new Hono<{ Bindings: Bindings }>()

const MEDANPEDIA_URL = 'https://medanpedia.com/api/v2'

export async function fetchMedanpedia(apiKey: string, action: string, data: Record<string, any> = {}) {
  const body = new URLSearchParams()
  body.append('key', apiKey)
  body.append('action', action)
  
  for (const [k, v] of Object.entries(data)) {
    body.append(k, String(v))
  }

  const response = await fetch(MEDANPEDIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  return response.json()
}

medanpediaRouter.post('/sync-services', async (c) => {
  try {
    const services = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'services')

    if (!Array.isArray(services)) {
      return c.json({ error: 'Format respons provider tidak valid', details: services }, 400)
    }

    const stmt = c.env.DB.prepare(`
      INSERT INTO services (id, provider_id, category, name, type, rate, min_order, max_order)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ON CONFLICT(id) DO UPDATE SET 
      rate = excluded.rate, status = 'active'
    `)

    const batchStmts = services.map((item: any) => {
      const localId = `srv_${item.service}`
      return stmt.bind(
        localId, 
        item.service.toString(), 
        item.category, 
        item.name, 
        item.type, 
        parseFloat(item.rate), 
        parseInt(item.min), 
        parseInt(item.max)
      )
    })

    await c.env.DB.batch(batchStmts)

    return c.json({ success: true, message: `${batchStmts.length} layanan berhasil disinkronkan.` })
  } catch (error) {
    return c.json({ error: 'Terjadi kesalahan saat sinkronisasi database' }, 500)
  }
})

medanpediaRouter.get('/balance', async (c) => {
  try {
    const balanceData = await fetchMedanpedia(c.env.MEDANPEDIA_API_KEY, 'balance')
    return c.json(balanceData)
  } catch (error) {
    return c.json({ error: 'Gagal mengecek saldo provider' }, 500)
  }
})
