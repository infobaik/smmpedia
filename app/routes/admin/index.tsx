// app/routes/admin/index.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  // Mengumpulkan data metrik menggunakan SQLite secara efisien
  const [userCount, orderCount, revenue, pendingOrders] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role != "admin"'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM orders'),
    c.env.DB.prepare('SELECT SUM(charge) as total FROM orders WHERE status = "completed"'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE status IN ("pending", "manual_reconciliation")')
  ])

  return c.render(
    <AdminLayout title="Dasbor Admin">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="mb-8">
          <h1 class="text-2xl font-bold tracking-tight">Ringkasan Sistem</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pantau performa panel, rekonsiliasi pesanan, dan arus kas.</p>
        </div>

        {/* Summary Cards */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 mr-4">
              <i data-lucide="users" class="w-8 h-8"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Member</p>
              <p class="text-2xl font-bold">{userCount.results[0].count}</p>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 mr-4">
              <i data-lucide="shopping-cart" class="w-8 h-8"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Transaksi</p>
              <p class="text-2xl font-bold">{orderCount.results[0].count}</p>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 mr-4">
              <i data-lucide="alert-circle" class="w-8 h-8"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Butuh Perhatian</p>
              <p class="text-2xl font-bold">{pendingOrders.results[0].count} <span class="text-sm font-normal text-gray-500">Pending/Manual</span></p>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 mr-4">
              <i data-lucide="wallet" class="w-8 h-8"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Omzet Selesai</p>
              <p class="text-2xl font-bold text-sm">Rp {(revenue.results[0].total || 0).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Tempat Untuk Grafik atau Aktivitas Terbaru */}
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 class="text-lg font-bold mb-4">Akses Cepat Manajemen</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/admin/orders" class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center text-center">
              <i data-lucide="refresh-cw" class="w-6 h-6 text-brand mb-2"></i>
              <span class="text-sm font-semibold">Rekonsiliasi Refund</span>
            </a>
            <a href="/admin/users" class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center text-center">
              <i data-lucide="banknote" class="w-6 h-6 text-brand mb-2"></i>
              <span class="text-sm font-semibold">Suntik Saldo Member</span>
            </a>
            <a href="/admin/providers" class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center text-center">
              <i data-lucide="server" class="w-6 h-6 text-brand mb-2"></i>
              <span class="text-sm font-semibold">Custom API & Webhook</span>
            </a>
            <a href="/admin/settings" class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center text-center">
              <i data-lucide="settings" class="w-6 h-6 text-brand mb-2"></i>
              <span class="text-sm font-semibold">Konfigurasi Web</span>
            </a>
          </div>
        </div>

      </div>
    </AdminLayout>,
    { title: 'Admin Area' }
  )
})
