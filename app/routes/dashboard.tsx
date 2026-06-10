import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

export default createRoute(async (c) => {
  const user = c.get('user')
  
  // Ambil saldo aktual dan jumlah pesanan user
  const [userData, ordersData] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(user.userId),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?1').bind(user.userId)
  ])

  const balance = userData.results[0]?.balance || 0
  const totalOrders = ordersData.results[0]?.count || 0

  return c.render(
    <MemberLayout title="Dasbor Member">
      <div class="p-6 md:p-8">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang!</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pantau aktivitas dan saldo akun Anda di sini.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-gradient-to-br from-blue-500 to-brand p-6 rounded-2xl text-white shadow-lg">
            <p class="text-blue-100 text-sm font-medium mb-1">Saldo Tersedia</p>
            <h2 class="text-3xl font-bold">Rp {balance.toLocaleString('id-ID')}</h2>
            <div class="mt-4 pt-4 border-t border-blue-400/30 flex justify-between items-center">
              <span class="text-sm">Gunakan untuk transaksi layanan</span>
              <a href="/wallet" class="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                Isi Saldo
              </a>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center">
            <div class="flex items-center space-x-4">
              <div class="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                <i data-lucide="shopping-bag" class="w-8 h-8"></i>
              </div>
              <div>
                <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Pesanan Dibuat</p>
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white">{totalOrders}</h2>
              </div>
            </div>
            <a href="/order" class="mt-6 text-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-brand dark:text-white py-2.5 rounded-xl font-medium transition text-sm">
              Buat Pesanan Baru
            </a>
          </div>
        </div>
      </div>
    </MemberLayout>,
    { title: 'Dasbor' }
  )
})
