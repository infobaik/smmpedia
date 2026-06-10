import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  const depositsData = await c.env.DB.prepare('SELECT id, amount, status, created_at, payment_link FROM deposits WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 20').bind(userSession.userId).all()
  const deposits = depositsData.results || []

  return c.render(
    <MemberLayout title="Dompet & Saldo" balance={balance}>
      <div class="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Dompet Akun</h1>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-gradient-to-br from-blue-600 to-brand p-6 rounded-2xl text-white shadow-lg text-center">
              <p class="text-blue-100 text-sm font-medium mb-1">Saldo Tersedia</p>
              <h2 class="text-3xl font-bold">Rp {balance.toLocaleString('id-ID')}</h2>
            </div>

            {/* Container ini yang akan dicetak QRIS di dalamnya */}
            <div id="depositFormContainer" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300">
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

          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-fit">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-bold">Riwayat Deposit</h2>
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
                      <td class="px-6 py-4 font-mono text-xs text-gray-500">{d.id}</td>
                      <td class="px-6 py-4 font-bold text-gray-900 dark:text-white">Rp {d.amount.toLocaleString('id-ID')}</td>
                      <td class="px-6 py-4">
                        {d.status === 'pending' ? (
                          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">PENDING</span>
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
        function getCookieValue(name) {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? match[2] : null;
        }

        document.getElementById('depositForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitDepositBtn');
          const alertBox = document.getElementById('depositAlert');
          const amount = document.getElementById('depositAmount').value;
          
          btn.disabled = true;
          btn.innerHTML = 'Memproses...';
          alertBox.classList.add('hidden');

          try {
            const token = getCookieValue('user_token');
            const response = await fetch('/api/payment/deposit', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token 
              },
              body: JSON.stringify({ amount })
            });
            const data = await response.json();
            
            if (data.success) {
              // MENCETAK QRIS LANGSUNG DI TEMPAT TANPA REDIRECT
              const container = document.getElementById('depositFormContainer');
              let htmlContent = \`
                <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 text-center">Scan QRIS Ini</h2>
                <div class="flex flex-col items-center space-y-4">
                  <div class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold w-full text-center">
                    Tagihan Berhasil Dibuat!
                  </div>
              \`;

              if (data.qr_url && data.raw_qris) {
                htmlContent += \`
                  <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm inline-block">
                    <img src="\${data.qr_url}" alt="QRIS Code" class="w-[200px] h-[200px]" />
                  </div>
                  <div class="w-full bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <p class="text-[10px] text-gray-500 font-mono break-all text-center leading-tight">\${data.raw_qris}</p>
                  </div>
                \`;
              }

              htmlContent += \`
                  <div class="w-full space-y-2 mt-2">
                    \${data.paylink ? \`<a href="\${data.paylink}" target="_blank" class="w-full bg-blue-50 text-blue-600 font-bold p-2.5 rounded-lg hover:bg-blue-100 transition flex items-center justify-center text-sm"><i data-lucide="external-link" class="w-4 h-4 mr-2"></i> Buka Link Payment</a>\` : ''}
                    <button onclick="window.location.reload()" class="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold p-2.5 rounded-lg transition hover:bg-gray-200 text-sm">
                      Selesai / Cek Saldo
                    </button>
                  </div>
                </div>
              \`;
              
              container.innerHTML = htmlContent;
              if (typeof lucide !== 'undefined') lucide.createIcons();

            } else {
              let errorMsg = data.error || 'Terjadi kesalahan sistem.';
              if (data.gateway_response) {
                errorMsg += '\\n\\nGateway: ' + JSON.stringify(data.gateway_response, null, 2);
              }
              alertBox.innerText = errorMsg;
              alertBox.className = 'p-3 rounded-lg text-xs font-mono bg-red-100 text-red-700 mb-4 block whitespace-pre-wrap text-left overflow-x-auto';
              btn.disabled = false;
              btn.innerHTML = '<i data-lucide="qr-code" class="w-5 h-5 mr-2"></i> Buat Tagihan QRIS';
              if (typeof lucide !== 'undefined') lucide.createIcons();
            }
          } catch (err) {
            alertBox.textContent = 'Gagal terhubung ke server.';
            alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 mb-4 block';
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="qr-code" class="w-5 h-5 mr-2"></i> Buat Tagihan QRIS';
            if (typeof lucide !== 'undefined') lucide.createIcons();
          }
        });
      `}} />
    </MemberLayout>,
    { title: 'Dompet & Deposit' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
