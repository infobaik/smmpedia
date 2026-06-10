// app/routes/order.tsx
import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  
  // 1. Ambil saldo user
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // 2. Baca parameter kategori dari URL (?category=...)
  const selectedCategory = c.req.query('category') || ''

  // 3. HANYA ambil daftar kategori untuk Dropdown (Sangat Ringan, CPU Aman)
  const categoriesData = await c.env.DB.prepare(`
    SELECT id, name FROM categories ORDER BY name ASC
  `).all()
  const categories = categoriesData.results || []

  // 4. HANYA ambil layanan JIKA user sudah memilih kategori
  let services = []
  if (selectedCategory) {
    const servicesData = await c.env.DB.prepare(`
      SELECT id, name, rate, margin, min_order, max_order 
      FROM services 
      WHERE category_id = ?1 AND status = 'active'
      ORDER BY rate ASC
    `).bind(selectedCategory).all()
    services = servicesData.results || []
  }

  return c.render(
    <MemberLayout title="Pesanan Baru" balance={balance}>
      <div class="p-6 md:p-8 max-w-5xl mx-auto">
        <div class="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 class="text-2xl font-bold">Buat Pesanan Baru</h1>
        </div>

        {/* DROPDOWN PEMILIH KATEGORI */}
        <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <label class="block text-sm font-semibold mb-2">Pilih Kategori Layanan</label>
          <select 
            onchange="window.location.href='?category=' + this.value" 
            class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand font-medium"
          >
            <option value="">-- Silakan Pilih Kategori Terlebih Dahulu --</option>
            {categories.map((cat: any) => (
              <option value={cat.id} selected={selectedCategory === cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* DAFTAR LAYANAN (Hanya muncul jika kategori sudah dipilih) */}
        {selectedCategory && services.length > 0 && (
          <div class="mb-10">
            <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
              <i data-lucide="list" class="w-5 h-5 mr-2 text-brand"></i> Layanan Tersedia
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((srv: any) => {
                // Sanitasi nama layanan agar tanda kutip tunggal tidak merusak string JavaScript onclick
                const safeName = srv.name.replace(/'/g, "\\'");
                const totalRate = srv.rate + (srv.margin || 0);

                return (
                  <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full hover:border-brand transition-colors">
                    <div>
                      <h3 class="font-bold text-gray-900 dark:text-white leading-tight mb-2 text-sm">{srv.name}</h3>
                      <div class="flex flex-col space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>Harga: <strong class="text-brand text-sm">Rp {totalRate.toLocaleString('id-ID')}</strong> / 1K</span>
                        <span>Min: {srv.min_order} | Max: {srv.max_order}</span>
                      </div>
                    </div>
                    <button 
                      onclick={`openOrderModal('${srv.id}', '${safeName}', ${totalRate}, ${srv.min_order}, ${srv.max_order})`} 
                      class="mt-4 w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-brand rounded-lg font-medium hover:bg-brand hover:text-white transition text-sm"
                    >
                      Pilih Layanan
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PESAN JIKA KATEGORI KOSONG */}
        {selectedCategory && services.length === 0 && (
          <div class="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
            <i data-lucide="package-x" class="w-10 h-10 mx-auto mb-3 text-gray-400"></i>
            <p>Tidak ada layanan aktif di kategori ini.</p>
          </div>
        )}

        {/* MODAL PEMESANAN */}
        <div id="orderModal" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 pr-4" id="modalServiceName">Nama Layanan</h3>
              <button onclick="document.getElementById('orderModal').classList.add('hidden')" class="text-gray-500 hover:text-gray-800 dark:hover:text-white shrink-0">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            
            <div class="overflow-y-auto p-6">
              <form id="orderForm" class="space-y-4">
                <input type="hidden" id="modalServiceId" />
                <input type="hidden" id="modalRate" />
                <div id="orderAlert" class="hidden p-3 rounded-lg text-sm font-medium"></div>

                <div>
                  <label class="block text-sm font-semibold mb-1">Target URL / Username</label>
                  <input type="text" id="targetLink" required placeholder="Masukkan target pesanan" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold mb-1">Jumlah</label>
                    <input type="number" id="orderQuantity" required placeholder="0" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                    <p class="text-[10px] text-gray-500 mt-1 font-medium" id="modalMinMax"></p>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">Total Biaya</label>
                    <input type="text" id="totalCost" readonly value="Rp 0" class="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 font-bold cursor-not-allowed text-brand text-sm" />
                  </div>
                </div>

                <button type="submit" id="submitOrderBtn" class="w-full bg-brand text-white font-bold p-3 rounded-lg hover:opacity-90 mt-6 transition flex items-center justify-center">
                  Bayar & Proses Pesanan
                </button>
              </form>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          function openOrderModal(id, name, rate, min, max) {
            document.getElementById('modalServiceId').value = id;
            document.getElementById('modalServiceName').textContent = name;
            document.getElementById('modalRate').value = rate;
            document.getElementById('modalMinMax').textContent = 'Min: ' + min + ' | Max: ' + max;
            document.getElementById('orderQuantity').setAttribute('min', min);
            document.getElementById('orderQuantity').setAttribute('max', max);
            document.getElementById('totalCost').value = 'Rp 0';
            document.getElementById('orderQuantity').value = '';
            document.getElementById('targetLink').value = '';
            document.getElementById('orderAlert').classList.add('hidden');
            document.getElementById('orderModal').classList.remove('hidden');
          }

          document.getElementById('orderQuantity').addEventListener('input', (e) => {
            const qty = parseInt(e.target.value) || 0;
            const rate = parseFloat(document.getElementById('modalRate').value);
            const total = (rate * (qty / 1000)).toFixed(2);
            document.getElementById('totalCost').value = 'Rp ' + parseFloat(total).toLocaleString('id-ID');
          });

          document.getElementById('orderForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitOrderBtn');
            const alertBox = document.getElementById('orderAlert');
            
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses...';
            alertBox.classList.add('hidden');

            const payload = {
              userId: localStorage.getItem('user_id'),
              localServiceId: document.getElementById('modalServiceId').value,
              link: document.getElementById('targetLink').value,
              quantity: parseInt(document.getElementById('orderQuantity').value),
              idempotencyKey: crypto.randomUUID()
            };

            try {
              const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const result = await response.json();

              if (result.success) {
                alertBox.textContent = result.message;
                alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-green-100 text-green-700 block';
                setTimeout(() => { window.location.href = '/history'; }, 1500);
              } else {
                alertBox.textContent = result.error;
                alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 block';
              }
            } catch (err) {
              alertBox.textContent = 'Gagal terhubung ke server.';
              alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 block';
            } finally {
              if(!alertBox.classList.contains('text-green-700')) {
                 btn.disabled = false;
                 btn.innerHTML = originalHtml;
              }
            }
          });
        `}} />
      </div>
    </MemberLayout>,
    { title: 'Pesanan Baru' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
