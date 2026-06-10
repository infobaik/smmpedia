// src/api/check.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const checkRouter = new Hono<{ Bindings: Bindings }>()

// Engine Template Dinamis
function buildPayload(templateStr: string, data: Record<string, any>) {
  let parsedStr = templateStr;
  for (const [key, value] of Object.entries(data)) {
    parsedStr = parsedStr.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return JSON.parse(parsedStr);
}

checkRouter.post('/:slug', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader !== `Bearer ${c.env.CRON_SECRET}`) {
      return c.json({ error: 'Akses Ditolak. Endpoint ini khusus untuk sistem internal.' }, 401)
    }

    const providerSlug = c.req.param('slug')
    const { provider_order_id } = await c.req.json() 

    if (!provider_order_id) {
      return c.json({ error: 'Parameter provider_order_id wajib disertakan' }, 400)
    }

    const provider = await c.env.DB.prepare('SELECT * FROM custom_providers WHERE slug = ?1 AND status = "active"')
      .bind(providerSlug)
      .first()

    if (!provider) {
      return c.json({ error: 'Provider custom tidak ditemukan' }, 404)
    }

    const payload = buildPayload(provider.check_body_template as string, { 
      order_id: provider_order_id 
    })

    const headers = JSON.parse(provider.headers_template as string)
    let bodyData: BodyInit;

    // Menangani perbedaan arsitektur API secara otomatis
    if (provider.content_type === 'application/x-www-form-urlencoded') {
      const urlSearchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(payload)) {
        urlSearchParams.append(key, String(value))
      }
      bodyData = urlSearchParams.toString()
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    } else {
      bodyData = JSON.stringify(payload)
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(provider.base_url as string, {
      method: provider.request_method as string,
      headers: headers,
      body: bodyData
    })

    const result = await response.json()
    
    return c.json({ success: true, result })
  } catch (error) {
    return c.json({ error: 'Gagal melakukan negosiasi data dengan server pihak ketiga' }, 500)
  }
})
