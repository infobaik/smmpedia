// src/api/auth.ts
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import type { Bindings } from '../index'

export const authRouter = new Hono<{ Bindings: Bindings }>()

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

authRouter.post('/register', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email dan password wajib diisi' }, 400)
  }

  const passwordHash = await hashPassword(password)
  const userId = crypto.randomUUID()

  try {
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, balance, role)
      VALUES (?1, ?2, ?3, 0.0, 'member')
    `).bind(userId, email, passwordHash).run()

    return c.json({ success: true, message: 'Registrasi berhasil' })
  } catch (error) {
    return c.json({ error: 'Email sudah terdaftar atau terjadi kesalahan' }, 400)
  }
})

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Kredensial tidak lengkap' }, 400)
  }

  const passwordHash = await hashPassword(password)

  const user = await c.env.DB.prepare(`
    SELECT id, email, role FROM users WHERE email = ?1 AND password_hash = ?2
  `).bind(email, passwordHash).first()

  if (!user) {
    return c.json({ error: 'Kredensial tidak valid' }, 401)
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  }
  
  // Perbaikan: Penulisan algoritma secara eksplisit sesuai standar Hono JWT terbaru
  const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

  return c.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, role: user.role }
  })
})
