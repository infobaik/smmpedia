import { createRoute } from 'honox/factory'
import { verify } from 'hono/jwt'
import { getCookie, deleteCookie } from 'hono/cookie'

export default createRoute(async (c, next) => {
  const path = c.req.path
  
  // Rute Publik & Webhook Gateway yang diizinkan lewat
  const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/payment/webhook']
  if (publicRoutes.includes(path)) return next()

  const token = getCookie(c, 'user_token')
  if (!token) {
    if (path.startsWith('/api/')) return c.json({ error: 'Unauthorized' }, 401)
    return c.redirect('/login')
  }

  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256')
    // Simpan data user ke context agar bisa dibaca di seluruh route dan API
    c.set('user', decoded)
    await next()
  } catch (error) {
    deleteCookie(c, 'user_token', { path: '/' })
    if (path.startsWith('/api/')) return c.json({ error: 'Token invalid' }, 401)
    return c.redirect('/login')
  }
})
