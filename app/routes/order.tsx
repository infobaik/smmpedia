// app/routes/order.tsx
import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  
  // Ambil saldo user
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // Baca parameter kategori dari URL
  const selectedCategory = c.req.query('category') || ''

  // Ambil daftar kategori untuk Dropdown
  const categoriesData = await c.env.DB.prepare(`
    SELECT id, name FROM categories ORDER BY name ASC
  `).all()
  const categories = categoriesData.results || []

  // Ambil layanan HANYA JIKA user sudah memilih kategori
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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Buat Pesanan Baru</h1>
          <p class="text-sm text-gray-500 mt-1">Pilih kategori dan temukan layanan yang Anda butuhkan dengan cepat.</p>
        </div>

        {/* AREA FILTER & PENCARIAN (KONTROL PENGGUNA) */}
        <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
          
          {/* 1. Pilih Kategori */}
          <div>
            <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">1. Pilih Kategori Layanan</label>
            <select 
              onchange="window.location.href='?category=' + this.value" 
              class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand font-medium transition-colors"
            >
              <option value="">-- Klik Disini Untuk Memilih Kategori --</option>
              {categories.map((cat: any) => (
                <option value={cat.id} selected={selectedCategory === cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Kotak Pencarian Live (Hanya muncul jika ada layanan di kategori ini) */}
          {selectedCategory && services.length > 0 && (
            <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
              <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">2. Cari Nama Layanan</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <i data-lucide="search" class="w-5 h-5 text-gray-400"></i>
                </div>
                <input 
                  type="text" 
                  id="searchInput" 
                  placeholder="Ketik untuk memfilter layanan dengan cepat..." 
                  class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 pl-10 outline-none focus:ring-2 focus:ring-brand text-sm transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* DAFTAR LAYANAN */}
        {selectedCategory && services.length > 0 && (
          <div class="mb-10">
            <div class="flex justify-between items-end mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                <i data-lucide="list-checks" class="w-5 h-5 mr-2 text-brand"></i> Layanan Tersedia
              </h2>
              <span id="serviceCounter" class="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                Total: {services.length}
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="servicesContainer">
              {services.map((srv: any) => {
                // Sanitasi tanda kutip agar JS tidak error
                const safeName = srv.name.replace(/'/g, "\\'");
                const totalRate = srv.rate + (srv.margin || 0);

                return (
                  // Tambahkan data-name untuk target filter pencarian live
                  <div data-name={srv.name.toLowerCase()} class="service-card bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full hover:border-brand hover:shadow-md transition-all">
                    <div>
                      <h3 class="font-bold text-gray-900 dark:text-white leading-tight mb-3 text-sm">{srv.name}</h3>
                      <div class="flex flex-col space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-1.5 rounded">
                          <span>Harga (1K)</span>
                          <strong class="text-brand text-sm">Rp {totalRate.toLocaleString('id-ID')}</strong>
                        </span>
                        <span class="flex justify-between items-center px-1">
                          <span>Pesanan Min.</span>
                          <strong class="text-gray-700 dark:text-gray-300">{srv.min_order.toLocaleString('id-ID')}</strong>
                        </span>
                        <span class="flex justify-between items-center px-1">
                          <span>Pesanan Max.</span>
                          <strong class="text-gray-700 dark:text-gray-300">{srv.max_order.toLocaleString('id-ID')}</strong>
                        </span>
                      </div>
                    </div>
                    <button 
                      onclick={`openOrderModal('${srv.id}', '${safeName}', ${totalRate}, ${srv.min_order}, ${srv.max_order})`} 
                      class="mt-5 w-full py-2.5 bg-blue-50 dark:bg-blue-900/30 text-brand rounded-lg font-bold hover:bg-brand hover:text-white transition flex items-center justify-center text-sm"
                    >
                      Pilih Layanan <i data-lucide="arrow-right" class="w-4 h-4 ml-1"></i>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Pesan jika pencarian tidak menemukan hasil (Awalnya tersembunyi) */}
            <div id="noResultMsg" class="hidden text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 mt-4">
              <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50"></i>
              <p class="font-medium">Tidak ada layanan yang cocok dengan kata kunci tersebut.</p>
              <p class="text-xs mt-1">Coba gunakan kata kunci lain atau periksa ejaan Anda.</p>
            </div>
          </div>
        )}

        {/* PESAN JIKA KATEGORI KOSONG */}
        {selectedCategory && services.length === 0 && (
          <div class="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 shadow-sm">
            <i data-lucide="package-open" class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"></i>
            <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori Kosong</h3>
            <p class="text-sm">Saat ini tidak ada layanan yang aktif di kategori ini.</p>
          </div>
        )}

        {/* MODAL PEMESANAN */}
        <div id="orderModal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div class="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 pr-4 leading-snug" id="modalServiceName">Nama Layanan</h3>
              <button onclick="document.getElementById('orderModal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            
            <div class="overflow-y-auto p-6">
              <form id="orderForm" class="space-y-5">
                <input type="hidden" id="modalServiceId" />
                <input type="hidden" id="modalRate" />
                <div id="orderAlert" class="hidden p-3.5 rounded-lg text-sm font-medium border"></div>

                <div>
                  <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Target URL / Username</label>
                  <input type="text" id="targetLink" required placeholder="Masukkan link atau username target" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm transition-shadow" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Jumlah Pesanan</label>
                    <input type="number" id="orderQuantity" required placeholder="0" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm transition-shadow" />
                    <p class="text-[11px] text-gray-500 mt-1.5 font-medium flex items-center" id="modalMinMax"></p>
                  </div>
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Total Biaya</label>
                    <input type="text" id="totalCost" readonly value="Rp 0" class="w-full bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-3 font-bold cursor-not-allowed text-brand text-sm" />
                  </div>
                </div>

                <div class="pt-2">
                  <button type="submit" id="submitOrderBtn" class="w-full bg-brand text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:opacity-90 transition-all flex items-center justify-center">
                    <i data-lucide="shopping-cart" class="w-5 h-5 mr-2"></i> Bayar & Proses Pesanan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          // === LOGIKA PENCARIAN LIVE (CLIENT-SIDE) ===
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.addEventListener('input', function(e) {
              const searchTerm = e.target.value.toLowerCase();
              const cards = document.querySelectorAll('.service-card');
              let visibleCount = 0;
              
              cards.forEach(card => {
                const name = card.getAttribute('data-name');
                if (name.includes(searchTerm)) {
                  card.style.display = 'flex'; // Kembalikan ke format flex bawaan tailwind
                  visibleCount++;
                } else {
                  card.style.display = 'none';
                }
              });

              // Tampilkan atau sembunyikan pesan kosong
              const noResultMsg = document.getElementById('noResultMsg');
              if (noResultMsg) {
                if (visibleCount === 0) {
                  noResultMsg.classList.remove('hidden');
                } else {
                  noResultMsg.classList.add('hidden');
                }
              }

              // Update counter
              const counter = document.getElementById('serviceCounter');
              if (counter) {
                counter.textContent = 'Menampilkan: ' + visibleCount;
              }
            });
          }

          // === LOGIKA MODAL & PEMESANAN ===
          function openOrderModal(id, name, rate, min, max) {
            document.getElementById('modalServiceId').value = id;
            document.getElementById('modalServiceName').textContent = name;
            document.getElementById('modalRate').value = rate;
            document.getElementById('modalMinMax').innerHTML = '<i data-lucide="info" class="w-3 h-3 mr-1"></i> Min: ' + min + ' &bull; Max: ' + max;
            document.getElementById('orderQuantity').setAttribute('min', min);
            document.getElementById('orderQuantity').setAttribute('max', max);
            document.getElementById('totalCost').value = 'Rp 0';
            document.getElementById('orderQuantity').value = '';
            document.getElementById('targetLink').value = '';
            document.getElementById('orderAlert').classList.add('hidden');
            document.getElementById('orderModal').classList.remove('hidden');
            lucide.createIcons();
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
            btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses Pesanan...';
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
                alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="check-circle" class="w-4 h-4 mr-2"></i>' + result.message + '</div>';
                alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border-green-200 block';
                lucide.createIcons();
                setTimeout(() => { window.location.href = '/history'; }, 1500);
              } else {
                alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i>' + result.error + '</div>';
                alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border-red-200 block';
                lucide.createIcons();
              }
            } catch (err) {
              alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="wifi-off" class="w-4 h-4 mr-2"></i>Gagal terhubung ke server.</div>';
              alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border-red-200 block';
              lucide.createIcons();
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
