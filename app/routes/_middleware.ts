// app/routes/_middleware.ts
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export default createMiddleware(async (c, next) => {
  const path = c.req.path
  const publicRoutes = ['/', '/login', '/register']
  
  // Biarkan API dan Webhook diurus oleh router src/api/
  if (path.startsWith('/api/')) return next()
  if (publicRoutes.includes(path)) return next()

  // Cek sesi (mengambil JWT dari cookie)
  const token = c.req.cookie('user_token')
  if (!token) return c.redirect('/login')

  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256')
    // Simpan data pengguna ke context agar bisa dibaca oleh halaman-halaman member
    c.set('user', decoded)
    await next()
  } catch (error) {
    // Token kedaluwarsa atau tidak valid
    c.header('Set-Cookie', 'user_token=; Max-Age=0; Path=/')
    return c.redirect('/login')
  }
})
