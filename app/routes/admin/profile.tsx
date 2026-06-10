import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  const sessionUser = c.get('user')
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const newPassword = String(body.new_password)
    const confirmPassword = String(body.confirm_password)

    if (newPassword !== confirmPassword) {
      message = "Konfirmasi kata sandi baru tidak cocok!"
    } else if (newPassword.length < 6) {
      message = "Kata sandi minimal 6 karakter."
    } else {
      // Hash password baru
      const msgBuffer = new TextEncoder().encode(newPassword)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      try {
        await c.env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2')
          .bind(passwordHash, sessionUser.userId)
          .run()
        message = "Kata sandi Admin berhasil diperbarui."
        isSuccess = true
      } catch (e) {
        message = "Gagal memperbarui kata sandi."
      }
    }
  }

  return c.render(
    <AdminLayout title="Profil Admin">
      <div class="max-w-2xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Keamanan & Sandi Admin</h1>

        {message && (
          <div class={`p-4 rounded-lg text-sm mb-6 font-medium ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
              <i data-lucide="shield" class="w-8 h-8"></i>
            </div>
            <div>
              <h2 class="font-bold text-lg text-gray-900 dark:text-white">Akses Root System</h2>
              <p class="text-sm text-gray-500">{sessionUser.email}</p>
            </div>
          </div>

          <form method="POST" class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label class="block text-sm font-semibold mb-1">Kata Sandi Baru</label>
              <input type="password" name="new_password" required minlength="6" placeholder="Masukkan kata sandi baru" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Ketik Ulang Kata Sandi Baru</label>
              <input type="password" name="confirm_password" required minlength="6" placeholder="Konfirmasi kata sandi" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <button type="submit" class="bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition mt-2">
              Perbarui Kata Sandi
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>,
    { title: 'Profil Admin' }
  )
})
