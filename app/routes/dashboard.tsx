import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  const [userData, ordersData] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?1').bind(userSession.userId)
  ])

  const balance = userData.results[0]?.balance || 0
  const totalOrders = ordersData.results[0]?.count || 0

  return c.render(
    <MemberLayout title="Dasbor Member" balance={balance}>
      <div class="p-6 md:p-8">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang!</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pantau aktivitas akun Anda di sini.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-gradient-to-br from-blue-500 to-brand p-6 rounded-2xl text-white shadow-lg flex flex-col justify-center">
            <div class="flex items-center space-x-4">
              <div class="p-4 bg-white/20 rounded-xl"><i data-lucide="shopping-bag" class="w-8 h-8"></i></div>
              <div>
                <p class="text-blue-100 text-sm font-medium">Total Pesanan</p>
                <h2 class="text-3xl font-bold">{totalOrders}</h2>
              </div>
            </div>
            <a href="/order" class="mt-6 text-center bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl font-medium transition text-sm">
              Buat Pesanan Baru
            </a>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Saldo Tersedia</p>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Rp {balance.toLocaleString('id-ID')}</h2>
            <a href="/wallet" class="mt-6 text-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 text-brand py-2.5 rounded-xl font-medium transition text-sm border border-gray-200 dark:border-gray-600">
              Isi Saldo (Top Up)
            </a>
          </div>
        </div>
      </div>
    </MemberLayout>,
    { title: 'Dasbor' }
  )
}
export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
