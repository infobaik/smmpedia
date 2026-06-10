// src/api/cloudinary.ts
import { Hono } from 'hono'
import type { Bindings } from '../index'

export const cloudinaryRouter = new Hono<{ Bindings: Bindings }>()

cloudinaryRouter.post('/sign', async (c) => {
  const timestamp = Math.round(new Date().getTime() / 1000).toString()
  const folder = 'smm_references'
  
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const stringToSign = paramsToSign + c.env.CLOUDINARY_SECRET

  const msgBuffer = new TextEncoder().encode(stringToSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return c.json({
    signature,
    timestamp,
    folder,
    apiKey: c.env.CLOUDINARY_API_KEY,
    cloudName: c.env.CLOUDINARY_CLOUD_NAME
  })
})
