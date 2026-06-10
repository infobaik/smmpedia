import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // Ambil riwayat deposit (invoice) pengguna
  const depositsData = await c.env.DB.prepare('SELECT id, amount, status, created_at, payment_link FROM deposits WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 20').bind(userSession.userId).all()
  const deposits = depositsData.results || []

  return c.render(
    <MemberLayout title="Dompet & Saldo" balance={balance}>
      <div class="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Dompet Akun</h1>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Kolom Buat Tagihan QRIS */}
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-gradient-to-br from-blue-600 to-brand p-6 rounded-2xl text-white shadow-lg text-center">
              <p class="text-blue-100 text-sm font-medium mb-1">Saldo Tersedia</p>
              <h2 class="text-3xl font-bold">Rp {balance.toLocaleString('id-ID')}</h2>
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Top Up Otomatis (QRIS)</h2>
              <form id="depositForm" class="space-y-4">
                <div id="depositAlert" class="hidden p-3 rounded-lg text-sm font-medium"></div>
                <div>
                  <label class="block text-sm font-semibold mb-1">Nominal Deposit (Rp)</label>
                  <input type="number" id="depositAmount" min="10000" required placeholder="Min. 10000" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-bold" />
                </div>
                <button type="submit" id="submitDepositBtn" class="w-full bg-brand text-white font-bold p-3 rounded-lg hover:opacity-90 transition flex items-center justify-center">
                  <i data-lucide="qr-code" class="w-5 h-5 mr-2"></i> Buat Tagihan QRIS
                </button>
              </form>
            </div>
          </div>

          {/* Kolom Riwayat Deposit */}
          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-bold">Riwayat Deposit (Invoice)</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th class="px-6 py-3 font-semibold">Order ID</th>
                    <th class="px-6 py-3 font-semibold">Nominal</th>
                    <th class="px-6 py-3 font-semibold">Status</th>
                    <th class="px-6 py-3 font-semibold">Tanggal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {deposits.map((d: any) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td class="px-6 py-4 font-mono text-xs">{d.id}</td>
                      <td class="px-6 py-4 font-bold text-gray-900 dark:text-white">Rp {d.amount.toLocaleString('id-ID')}</td>
                      <td class="px-6 py-4">
                        {d.status === 'pending' ? (
                          <a href={d.payment_link} target="_blank" class="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full transition flex items-center w-fit">
                            Bayar Sekarang <i data-lucide="external-link" class="w-3 h-3 ml-1"></i>
                          </a>
                        ) : d.status === 'paid' ? (
                          <span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">LUNAS</span>
                        ) : (
                          <span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">GAGAL</span>
                        )}
                      </td>
                      <td class="px-6 py-4 text-gray-500 text-xs">{new Date(d.created_at).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {deposits.length === 0 && (
                    <tr><td colSpan={4} class="px-6 py-8 text-center text-gray-500">Belum ada riwayat deposit.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('depositForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitDepositBtn');
          const alertBox = document.getElementById('depositAlert');
          const amount = document.getElementById('depositAmount').value;
          
          btn.disabled = true;
          btn.innerHTML = 'Memproses...';
          alertBox.classList.add('hidden');

          try {
            const response = await fetch('/api/payment/deposit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount })
            });
            const data = await response.json();
            
            if (data.success) {
              window.location.href = data.payment_url;
            } else {
              alertBox.textContent = data.error || 'Terjadi kesalahan sistem.';
              alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 mb-4 block';
            }
          } catch (err) {
            alertBox.textContent = 'Gagal terhubung ke server.';
            alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 mb-4 block';
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="qr-code" class="w-5 h-5 mr-2"></i> Buat Tagihan QRIS';
            lucide.createIcons();
          }
        });
      `}} />
    </MemberLayout>,
    { title: 'Dompet & Deposit' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
