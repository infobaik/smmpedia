import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

export default createRoute(async (c) => {
  const user = c.get('user')
  const ordersData = await c.env.DB.prepare(`
    SELECT o.id, s.name, o.link, o.quantity, o.charge, o.status, o.created_at 
    FROM orders o 
    JOIN services s ON o.service_id = s.id 
    WHERE o.user_id = ?1 
    ORDER BY o.created_at DESC LIMIT 50
  `).bind(user.userId).all()

  const orders = ordersData.results || []

  return c.render(
    <MemberLayout title="Riwayat Transaksi">
      <div class="p-6 md:p-8">
        <h1 class="text-2xl font-bold mb-6">Riwayat Pesanan</h1>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-4 font-semibold">Tanggal</th>
                  <th class="px-6 py-4 font-semibold">Layanan</th>
                  <th class="px-6 py-4 font-semibold">Target</th>
                  <th class="px-6 py-4 font-semibold">Jumlah</th>
                  <th class="px-6 py-4 font-semibold">Biaya</th>
                  <th class="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((o: any) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 text-gray-500">{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                    <td class="px-6 py-4 font-medium">{o.name}</td>
                    <td class="px-6 py-4 text-gray-500 truncate max-w-[150px]">{o.link}</td>
                    <td class="px-6 py-4">{o.quantity}</td>
                    <td class="px-6 py-4">Rp {o.charge.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4">
                      <span class={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                        o.status === 'completed' || o.status === 'success' ? 'bg-green-100 text-green-700' :
                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} class="px-6 py-8 text-center text-gray-500">Belum ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MemberLayout>,
    { title: 'Riwayat' }
  )
})
