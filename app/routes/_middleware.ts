import { createRoute } from 'honox/factory'
import { verify } from 'hono/jwt'
import { getCookie, deleteCookie } from 'hono/cookie'

export default createRoute(async (c, next) => {
  const path = c.req.path
  
  // Daftarkan rute yang tidak perlu pengecekan login
  const publicRoutes = ['/', '/login', '/register']
  
  // Biarkan jalur API diproses oleh router src/api/ tanpa dicegat di sini
  if (path.startsWith('/api/')) return next()
  if (publicRoutes.includes(path)) return next()

  // Mengambil token JWT dari Cookie menggunakan helper Hono
  const token = getCookie(c, 'user_token')
  if (!token) return c.redirect('/login')

  try {
    // Verifikasi keabsahan JWT (Pastikan algoritma sesuai dengan file auth.ts)
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256')
    
    // Simpan data pengguna (ID, Email, Role) ke context agar bisa dibaca halaman lain
    c.set('user', decoded)
    await next()
  } catch (error) {
    // Jika token palsu atau sudah kedaluwarsa, hapus cookie dan tendang ke login
    deleteCookie(c, 'user_token', { path: '/' })
    return c.redirect('/login')
  }
})
