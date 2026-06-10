import { createRoute } from 'honox/factory'

export default createRoute(async (c, next) => {
  // Data user sudah dipastikan ada karena telah melewati _middleware.ts global
  const user = c.get('user')

  // Isolasi Ketat: Jika bukan admin, tendang kembali ke Dasbor Member
  if (!user || user.role !== 'admin') {
    return c.redirect('/dashboard')
  }

  await next()
})
