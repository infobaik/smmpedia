import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // ==========================================
  // LOGIKA PAGINASI SERVER-SIDE
  // ==========================================
  const url = new URL(c.req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  // Pastikan opsi limit tervalidasi ke 10, 20, 50, atau 100. Default 10.
  const limitParam = parseInt(url.searchParams.get('limit') || '10')
  const allowedLimits = [10, 20, 50, 100]
  const limit = allowedLimits.includes(limitParam) ? limitParam : 10
  const offset = (page - 1) * limit

  // Hitung total seluruh transaksi user ini
  const countData = await c.env.DB.prepare('SELECT COUNT(*) as total FROM orders WHERE user_id = ?1').bind(userSession.userId).first()
  const totalItems = countData?.total || 0
  const totalPages = Math.ceil(totalItems / limit) || 1

  // Ambil data dengan LIMIT dan OFFSET
  const ordersData = await c.env.DB.prepare(`
    SELECT o.id, s.name, o.link, o.quantity, o.charge, o.status, o.created_at, o.start_count, o.remains 
    FROM orders o JOIN services s ON o.service_id = s.id 
    WHERE o.user_id = ?1 ORDER BY o.created_at DESC LIMIT ?2 OFFSET ?3
  `).bind(userSession.userId, limit, offset).all()
  const orders = ordersData.results || []

  // Variabel untuk indikator UI
  const showingStart = totalItems === 0 ? 0 : offset + 1
  const showingEnd = Math.min(offset + limit, totalItems)

  return c.render(
    <MemberLayout title="Riwayat Transaksi" balance={balance}>
      <div class="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Riwayat Pesanan</h1>
        
        <div class="flex flex-col h-full">
          
          {/* KONTROL PAGINASI (HEADER) - MOBILE FRIENDLY */}
          <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div class="text-sm text-gray-600 dark:text-gray-300 flex items-center">
              Tampilkan
              <select 
                onchange="window.location.href='?limit=' + this.value + '&page=1'" 
                class="mx-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-1.5 focus:ring-brand focus:border-brand outline-none cursor-pointer"
              >
                <option value="10" selected={limit === 10}>10</option>
                <option value="20" selected={limit === 20}>20</option>
                <option value="50" selected={limit === 50}>50</option>
                <option value="100" selected={limit === 100}>100</option>
              </select>
              entri per halaman
            </div>
          </div>

          {/* TABEL DATA */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-grow mb-4">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th class="px-4 py-4 font-semibold">ID</th>
                    <th class="px-4 py-4 font-semibold whitespace-nowrap">Tanggal</th>
                    <th class="px-4 py-4 font-semibold">Tautan</th>
                    <th class="px-4 py-4 font-semibold">Biaya</th>
                    <th class="px-4 py-4 font-semibold whitespace-nowrap text-center">Mulai Hitungan</th>
                    <th class="px-4 py-4 font-semibold text-center">Jumlah</th>
                    <th class="px-4 py-4 font-semibold">Layanan</th>
                    <th class="px-4 py-4 font-semibold text-center">Status</th>
                    <th class="px-4 py-4 font-semibold text-center">Sisa</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((o: any) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {/* Mengambil 8 karakter pertama ID agar tidak terlalu panjang di tabel */}
                      <td class="px-4 py-4 font-mono text-xs text-gray-500">{o.id.split('_')[1] || o.id.substring(0, 8)}</td>
                      
                      <td class="px-4 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      
                      <td class="px-4 py-4 text-blue-600 dark:text-blue-400 truncate max-w-[150px]">
                        <a href={o.link.startsWith('http') ? o.link : `https://${o.link}`} target="_blank" rel="noopener noreferrer" class="hover:underline">
                          {o.link}
                        </a>
                      </td>
                      
                      <td class="px-4 py-4 font-bold text-brand whitespace-nowrap">Rp {o.charge.toLocaleString('id-ID')}</td>
                      
                      <td class="px-4 py-4 text-gray-700 dark:text-gray-300 text-center font-medium">
                        {o.start_count !== null ? o.start_count : '-'}
                      </td>
                      
                      <td class="px-4 py-4 text-gray-700 dark:text-gray-300 text-center font-bold">{o.quantity}</td>
                      
                      <td class="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate" title={o.name}>
                        {o.name}
                      </td>
                      
                      <td class="px-4 py-4 text-center">
                        <span class={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          o.status === 'completed' || o.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          o.status === 'processing' || o.status === 'sedang berjalan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          o.status === 'pending' || o.status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          o.status === 'partial' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      
                      <td class="px-4 py-4 text-gray-700 dark:text-gray-300 text-center font-medium">
                        {o.remains !== null ? o.remains : '-'}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={9} class="px-6 py-8 text-center text-gray-500">Belum ada transaksi di halaman ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* KONTROL PAGINASI (FOOTER) - PREV/NEXT MOBILE FRIENDLY */}
          <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
            <span class="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left w-full sm:w-auto">
              Menampilkan <span class="font-bold text-gray-900 dark:text-white">{showingStart}</span> sampai <span class="font-bold text-gray-900 dark:text-white">{showingEnd}</span> dari <span class="font-bold text-gray-900 dark:text-white">{totalItems}</span> entri
            </span>
            
            <div class="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
              <a 
                href={page <= 1 ? '#' : `?page=${page - 1}&limit=${limit}`} 
                class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                onclick={page <= 1 ? "event.preventDefault()" : ""}
              >
                Sebelumnya
              </a>
              
              <div class="px-4 py-2 text-sm font-bold bg-brand text-white rounded-lg shadow-sm">
                {page} / {totalPages}
              </div>

              <a 
                href={page >= totalPages ? '#' : `?page=${page + 1}&limit=${limit}`} 
                class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                onclick={page >= totalPages ? "event.preventDefault()" : ""}
              >
                Selanjutnya
              </a>
            </div>
          </div>

        </div>
      </div>
    </MemberLayout>,
    { title: 'Riwayat' }
  )
}
export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
