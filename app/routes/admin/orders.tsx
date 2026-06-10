import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

const routeHandler = async (c: any) => {
  let message = null

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const orderId = String(body.order_id)
    const userId = String(body.user_id)
    const charge = parseFloat(String(body.charge))

    try {
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE orders SET status = "error_refunded" WHERE id = ?1 AND status != "error_refunded"').bind(orderId),
        c.env.DB.prepare('UPDATE users SET balance = balance + ?1 WHERE id = ?2').bind(charge, userId)
      ])
      message = "Pesanan dibatalkan dan saldo berhasil direfund ke pengguna."
    } catch (e) {
      message = "Gagal melakukan refund."
    }
  }

  const ordersData = await c.env.DB.prepare(`
    SELECT o.id, o.user_id, u.email, s.name as service_name, o.link, o.quantity, o.charge, o.status, o.created_at 
    FROM orders o 
    JOIN users u ON o.user_id = u.id
    JOIN services s ON o.service_id = s.id
    ORDER BY o.created_at DESC LIMIT 100
  `).all()

  const orders = ordersData.results || []

  return c.render(
    <AdminLayout title="Manajemen Transaksi">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Manajemen Transaksi & Rekonsiliasi</h1>

        {message && (
          <div class="p-4 rounded-lg bg-green-100 text-green-700 text-sm font-medium mb-6">{message}</div>
        )}

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-4 font-semibold">User</th>
                  <th class="px-6 py-4 font-semibold">Layanan & Target</th>
                  <th class="px-6 py-4 font-semibold">Biaya</th>
                  <th class="px-6 py-4 font-semibold">Status</th>
                  <th class="px-6 py-4 font-semibold text-right">Aksi Manual</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((o: any) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 font-medium">{o.email}</td>
                    <td class="px-6 py-4">
                      <div class="font-bold text-gray-900 dark:text-white">{o.service_name}</div>
                      <div class="text-xs text-gray-500">Qty: {o.quantity} | Target: {o.link}</div>
                    </td>
                    <td class="px-6 py-4 font-medium text-brand">Rp {o.charge.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4">
                      <span class={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'completed' || o.status === 'success' ? 'bg-green-100 text-green-700' :
                        o.status === 'error_refunded' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      {o.status !== 'completed' && o.status !== 'success' && o.status !== 'error_refunded' && (
                        <form method="POST" onsubmit="return confirm('Yakin ingin merefund pesanan ini dan mengembalikan saldo user?')">
                          <input type="hidden" name="order_id" value={o.id} />
                          <input type="hidden" name="user_id" value={o.user_id} />
                          <input type="hidden" name="charge" value={o.charge} />
                          <button type="submit" class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold transition">
                            Refund
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>,
    { title: 'Transaksi' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
