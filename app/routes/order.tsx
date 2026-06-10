import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

export default createRoute(async (c) => {
  const servicesData = await c.env.DB.prepare(`
    SELECT s.id, c.name as category, s.name, s.rate, s.margin, s.min_order, s.max_order 
    FROM services s
    JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active'
  `).all()
  
  const services = servicesData.results || []
  const categories = [...new Set(services.map(s => s.category))]

  return c.render(
    <MemberLayout title="Pesanan Baru">
      <div class="p-6 md:p-8 max-w-5xl mx-auto">
        <div class="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 class="text-2xl font-bold">Katalog Layanan</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Pilih layanan yang Anda butuhkan.</p>
        </div>

        {categories.map((category) => (
          <div class="mb-10">
            <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
              <i data-lucide="tag" class="w-5 h-5 mr-2 text-brand"></i>
              {category}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.filter(s => s.category === category).map((srv: any) => (
                <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <h3 class="font-bold text-gray-900 dark:text-white leading-tight mb-2">{srv.name}</h3>
                    <div class="flex flex-col space-y-1 text-sm text-gray-500">
                      <span>Harga: <strong class="text-brand">Rp {(srv.rate + (srv.margin || 0)).toLocaleString('id-ID')}</strong> / 1K</span>
                      <span>Min: {srv.min_order} | Max: {srv.max_order}</span>
                    </div>
                  </div>
                  <button 
                    onclick={`openOrderModal('${srv.id}', '${srv.name}', ${srv.rate + (srv.margin || 0)}, ${srv.min_order}, ${srv.max_order})`}
                    class="mt-4 w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-brand rounded-lg font-medium hover:bg-brand hover:text-white transition text-sm">
                    Pesan Sekarang
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Modal Form Murni Hanya URL dan Jumlah */}
        <div id="orderModal" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 class="font-bold text-lg text-gray-900 dark:text-white" id="modalServiceName">Nama Layanan</h3>
              <button onclick="document.getElementById('orderModal').classList.add('hidden')" class="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <i data-lucide="x" class="w-6 h-6"></i>
              </button>
            </div>
            
            <form id="orderForm" class="p-6 space-y-4">
              <input type="hidden" id="modalServiceId" />
              <input type="hidden" id="modalRate" />
              <div id="orderAlert" class="hidden p-3 rounded-lg text-sm font-medium"></div>

              <div>
                <label class="block text-sm font-semibold mb-1">Target URL / Username</label>
                <input type="text" id="targetLink" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" placeholder="https://instagram.com/..." />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold mb-1">Jumlah</label>
                  <input type="number" id="orderQuantity" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
                  <p class="text-xs text-gray-500 mt-1" id="modalMinMax"></p>
                </div>
                <div>
                  <label class="block text-sm font-semibold mb-1">Total Biaya</label>
                  <input type="text" id="totalCost" readonly value="Rp 0" class="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 font-bold cursor-not-allowed" />
                </div>
              </div>

              <button type="submit" id="submitOrderBtn" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition mt-4">
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
          
          btn.disabled = true;
          btn.innerHTML = 'Memproses...';
          alertBox.classList.add('hidden');

          const payload = {
            userId: localStorage.getItem('user_id'),
            localServiceId: document.getElementById('modalServiceId').value,
            link: document.getElementById('targetLink').value,
            quantity: parseInt(document.getElementById('orderQuantity').value),
            idempotencyKey: crypto.randomUUID()
          };

          try {
            const token = getCookieValue('user_token');
            const response = await fetch('/api/orders/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
              alertBox.textContent = result.message;
              alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-green-100 text-green-700';
              alertBox.classList.remove('hidden');
              setTimeout(() => { document.getElementById('orderModal').classList.add('hidden'); }, 2000);
            } else {
              alertBox.textContent = result.error;
              alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
              alertBox.classList.remove('hidden');
            }
          } catch (err) {
            alertBox.textContent = 'Gagal terhubung ke server.';
            alertBox.className = 'p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
            alertBox.classList.remove('hidden');
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Bayar & Proses Pesanan';
          }
        });

        function getCookieValue(name) {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? match[2] : null;
        }
      `}} />
    </MemberLayout>,
    { title: 'Pesanan Baru' }
  )
})
