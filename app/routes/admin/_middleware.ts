// app/routes/admin/_middleware.ts
import { createMiddleware } from 'hono/factory'

export default createMiddleware(async (c, next) => {
  // Middleware sebelumnya (_middleware.ts global) sudah menjamin c.get('user') ada
  const user = c.get('user')

  if (!user || user.role !== 'admin') {
    // Jika member biasa mencoba masuk admin, tendang kembali ke dasbor member
    return c.redirect('/dashboard')
  }

  await next()
})
