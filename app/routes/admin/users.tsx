import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  let message = null

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const userId = String(body.user_id)
    const adjustment = parseFloat(String(body.amount))

    try {
      // Adjustment bisa positif (suntik saldo) atau negatif (potong saldo)
      await c.env.DB.prepare('UPDATE users SET balance = balance + ?1 WHERE id = ?2')
        .bind(adjustment, userId).run()
      message = "Saldo pengguna berhasil disesuaikan."
    } catch (e) {
      message = "Gagal memproses perubahan saldo."
    }
  }

  const usersData = await c.env.DB.prepare('SELECT id, name, email, whatsapp, balance, role FROM users ORDER BY created_at DESC').all()
  const users = usersData.results || []

  return c.render(
    <AdminLayout title="Manajemen Pengguna">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Manajemen Pengguna</h1>

        {message && (
          <div class="p-4 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium mb-6">{message}</div>
        )}

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-4 font-semibold">Pengguna</th>
                  <th class="px-6 py-4 font-semibold">Kontak</th>
                  <th class="px-6 py-4 font-semibold">Saldo</th>
                  <th class="px-6 py-4 font-semibold text-right">Aksi Manual (Suntik/Potong)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u: any) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4">
                      <div class="font-bold text-gray-900 dark:text-white">{u.name || 'Belum diatur'}</div>
                      <div class="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td class="px-6 py-4 text-gray-500">{u.whatsapp || '-'}</td>
                    <td class="px-6 py-4 font-bold text-brand">Rp {u.balance.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4 text-right">
                      <form method="POST" class="inline-flex items-center">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="number" name="amount" placeholder="Nominal (+/-)" required class="w-32 bg-gray-50 border border-gray-300 rounded-l-lg px-2 py-1.5 outline-none text-xs" />
                        <button type="submit" class="bg-slate-800 text-white px-3 py-1.5 rounded-r-lg text-xs font-semibold hover:bg-slate-700 transition">Update</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>,
    { title: 'Pengguna' }
  )
})
