// app/routes/dashboard.tsx
import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  
  // Ambil saldo pengguna
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // Ambil statistik pesanan
  const statsData = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM orders WHERE user_id = ?1 GROUP BY status
  `).bind(userSession.userId).all()
  
  const stats = { pending: 0, processing: 0, success: 0, error: 0, total: 0 }
  statsData.results?.forEach((row: any) => {
    if (row.status === 'pending' || row.status === 'waiting') stats.pending = row.count
    else if (row.status === 'processing' || row.status === 'sedang berjalan') stats.processing = row.count
    else if (row.status === 'success' || row.status === 'completed') stats.success = row.count
    else if (['error', 'canceled', 'partial'].includes(row.status)) stats.error += row.count
    stats.total += row.count
  })

  // ==========================================================
  // PERBAIKAN: Menambahkan start_count dan remains ke Kueri
  // ==========================================================
  const recentOrdersData = await c.env.DB.prepare(`
    SELECT o.id, s.name, o.quantity, o.charge, o.status, o.created_at, o.start_count, o.remains 
    FROM orders o JOIN services s ON o.service_id = s.id 
    WHERE o.user_id = ?1 ORDER BY o.created_at DESC LIMIT 5
  `).bind(userSession.userId).all()
  
  const recentOrders = recentOrdersData.results || []

  return c.render(
    <MemberLayout title="Dasbor" balance={balance}>
      <div class="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dasbor SMMPedia</h1>
            <p class="text-sm text-gray-500 mt-1">Selamat datang kembali! Pantau aktivitas dan pesanan Anda di sini.</p>
          </div>
          <a href="/order" class="bg-brand text-white font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition shadow-sm flex items-center">
            <i data-lucide="plus-circle" class="w-5 h-5 mr-2"></i> Pesanan Baru
          </a>
        </div>

        {/* TOMBOL PINTASAN AKSES RESELLER & REFERRAL */}
        <div class="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center">
            <div class="bg-white/20 p-3 rounded-full mr-4 hidden sm:block">
              <i data-lucide="code-2" class="w-8 h-8 text-white"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold">API Reseller & Program Referral</h2>
              <p class="text-sm text-indigo-100 mt-1">Integrasikan layanan SMMPedia ke website Anda atau bagikan kode referral untuk komisi pasif.</p>
            </div>
          </div>
          <a href="/developer" class="w-full sm:w-auto bg-white text-indigo-700 font-bold py-3 px-6 rounded-xl hover:bg-indigo-50 transition whitespace-nowrap text-center shadow-sm">
            Akses Reseller Area <i data-lucide="arrow-right" class="w-4 h-4 inline ml-1"></i>
          </a>
        </div>

        {/* KOTAK STATISTIK */}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg mr-4"><i data-lucide="shopping-bag" class="w-6 h-6 text-blue-600 dark:text-blue-400"></i></div>
            <div>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pesanan</p>
              <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-lg mr-4"><i data-lucide="loader" class="w-6 h-6 text-amber-600 dark:text-amber-400"></i></div>
            <div>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Memproses</p>
              <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.processing + stats.pending}</p>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="bg-green-100 dark:bg-green-900/40 p-3 rounded-lg mr-4"><i data-lucide="check-circle" class="w-6 h-6 text-green-600 dark:text-green-400"></i></div>
            <div>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Selesai</p>
              <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.success}</p>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
            <div class="bg-red-100 dark:bg-red-900/40 p-3 rounded-lg mr-4"><i data-lucide="x-circle" class="w-6 h-6 text-red-600 dark:text-red-400"></i></div>
            <div>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Gagal/Error</p>
              <p class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.error}</p>
            </div>
          </div>
        </div>

        {/* TABEL PESANAN TERAKHIR - UPDATE KOLOM HITUNGAN & SISA */}
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Pesanan Terakhir</h2>
            <a href="/history" class="text-sm text-brand font-semibold hover:underline">Lihat Semua</a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-3 font-semibold">ID & Layanan</th>
                  <th class="px-6 py-3 font-semibold text-center whitespace-nowrap">Target & Hitungan</th>
                  <th class="px-6 py-3 font-semibold">Harga</th>
                  <th class="px-6 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={4} class="px-6 py-8 text-center text-gray-500">Belum ada riwayat pesanan.</td></tr>
                ) : (
                  recentOrders.map((o: any) => {
                    let statusColor = 'bg-gray-100 text-gray-800'
                    if (o.status === 'success' || o.status === 'completed') statusColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    else if (o.status === 'processing' || o.status === 'sedang berjalan') statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    else if (o.status === 'pending' || o.status === 'waiting') statusColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    else if (['error', 'canceled', 'partial'].includes(o.status)) statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    
                    const orderDate = new Date(o.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    
                    const startCountStr = o.start_count !== null ? o.start_count : '-'
                    const remainsStr = o.remains !== null ? o.remains : '-'

                    return (
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                        <td class="px-6 py-4">
                          <div class="font-bold text-gray-900 dark:text-white line-clamp-1" title={o.name}>{o.name}</div>
                          <div class="text-xs text-gray-500 mt-1 font-mono">{o.id.split('_')[1] || o.id.substring(0,8)} • {orderDate}</div>
                        </td>
                        
                        {/* Kolom Compact untuk Target, Start Count, dan Remains */}
                        <td class="px-6 py-4">
                          <div class="flex flex-col items-center justify-center space-y-1">
                            <span class="font-bold text-gray-900 dark:text-white" title="Target / Jumlah yang dipesan">{o.quantity.toLocaleString('id-ID')}</span>
                            <div class="flex items-center space-x-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                              <span title="Mulai Hitungan">S: {startCountStr}</span>
                              <span>|</span>
                              <span title="Sisa">R: {remainsStr}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td class="px-6 py-4 font-bold text-brand whitespace-nowrap">Rp {o.charge.toLocaleString('id-ID')}</td>
                        
                        <td class="px-6 py-4 text-center">
                          <span class={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap ${statusColor}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MemberLayout>,
    { title: 'Dasbor SMMPedia' }
  )
}

export const GET = createRoute(routeHandler)
export default createRoute(routeHandler)
