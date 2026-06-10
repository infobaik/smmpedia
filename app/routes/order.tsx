// app/routes/order.tsx
import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  
  // 1. Ambil saldo user terbaru
  const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  // 2. Baca parameter kategori dari URL (?category=...)
  const selectedCategory = c.req.query('category') || ''

  // 3. Ambil seluruh daftar kategori untuk pilihan utama
  const categoriesData = await c.env.DB.prepare(`
    SELECT id, name FROM categories ORDER BY name ASC
  `).all()
  const categories = categoriesData.results || []

  // 4. Ambil daftar layanan lengkap dengan atribut refund/cancel jika kategori dipilih
  let services = []
  if (selectedCategory) {
    const servicesData = await c.env.DB.prepare(`
      SELECT id, name, rate, margin, min_order, max_order, is_refill, is_cancel, is_dripfeed 
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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Formulir Pesanan Baru</h1>
          <p class="text-sm text-gray-500 mt-1">Sistem pencarian pintar untuk membantu Anda memproses pesanan media sosial dalam hitungan detik.</p>
        </div>

        {/* KOTAK UTAMA: SELEKSI KATEGORI & FILTER PENCARIAN */}
        <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
          
          {/* BAGIAN 1: PEMILIHAN KATEGORI */}
          <div>
            <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center">
              <span class="w-5 h-5 bg-brand text-white text-xs flex items-center justify-center rounded-full mr-2">1</span>
              Pilih Kategori Utama
            </label>
            <select 
              onchange="window.location.href='?category=' + this.value" 
              class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand font-semibold transition-colors cursor-pointer"
            >
              <option value="">-- Silakan Pilih Kategori Layanan --</option>
              {categories.map((cat: any) => (
                <option value={cat.id} selected={selectedCategory === cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* BAGIAN 2: MULTI-FILTER BAR (Hanya muncul jika kategori sudah dipilih dan ada layanan) */}
          {selectedCategory && services.length > 0 && (
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
              
              {/* Input Pencarian Teks */}
              <div>
                <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                  <span class="w-5 h-5 bg-brand text-white text-xs flex items-center justify-center rounded-full mr-2">2</span>
                  Pencarian Kata Kunci & Filter Fitur
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <i data-lucide="search" class="w-5 h-5 text-gray-400"></i>
                  </div>
                  <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Ketik kata kunci (contoh: 'Indo', 'Likes', 'Drop')..." 
                    class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 pl-10 outline-none focus:ring-2 focus:ring-brand text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Kelompok Tombol Filter Spesifikasi Produk */}
              <div>
                <span class="block text-xs font-bold uppercase text-gray-400 mb-2">Saring Berdasarkan Fitur:</span>
                <div class="flex flex-wrap gap-2" id="filterBadgeGroup">
                  <button type="button" data-filter="all" class="filter-btn bg-brand text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm">
                    Semua Layanan
                  </button>
                  <button type="button" data-filter="refill" class="filter-btn bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all">
                    🔥 Bergaransi (Refill)
                  </button>
                  <button type="button" data-filter="cancel" class="filter-btn bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all">
                    ❌ Bisa Di-Cancel
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* CONTAINER LAYANAN YANG TERSEDIA */}
        {selectedCategory && services.length > 0 && (
          <div class="mb-10">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                <i data-lucide="layers" class="w-5 h-5 mr-2 text-brand"></i> Hasil Pencarian Layanan
              </h2>
              <span id="serviceCounter" class="text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
                Memuat total data: {services.length}
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="servicesContainer">
              {services.map((srv: any) => {
                const safeName = srv.name.replace(/'/g, "\\'");
                const totalRate = srv.rate + (srv.margin || 0);

                return (
                  <div 
                    data-name={srv.name.toLowerCase()} 
                    data-is-refill={srv.is_refill ? "1" : "0"}
                    data-is-cancel={srv.is_cancel ? "1" : "0"}
                    class="service-card bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full hover:border-brand hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Deretan Badge Fitur Produk di Atas Judul */}
                      <div class="flex flex-wrap gap-1 mb-2.5">
                        {srv.is_refill === 1 && (
                          <span class="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">Refill</span>
                        )}
                        {srv.is_cancel === 1 && (
                          <span class="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">Cancelable</span>
                        )}
                        {srv.is_dripfeed === 1 && (
                          <span class="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">Dripfeed</span>
                        )}
                      </div>

                      <h3 class="font-bold text-gray-900 dark:text-white leading-tight mb-4 text-sm min-h-[40px] line-clamp-3">{srv.name}</h3>
                      
                      <div class="flex flex-col space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <div class="flex justify-between items-center bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg border border-gray-100 dark:border-gray-750">
                          <span>Harga / 1.000</span>
                          <strong class="text-brand text-sm font-extrabold">Rp {totalRate.toLocaleString('id-ID')}</strong>
                        </div>
                        <div class="flex justify-between items-center px-1 pt-1">
                          <span>Batas Min. Order</span>
                          <span class="text-gray-700 dark:text-gray-300 font-semibold">{srv.min_order.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between items-center px-1">
                          <span>Batas Max. Order</span>
                          <span class="text-gray-700 dark:text-gray-300 font-semibold">{srv.max_order.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onclick={`openOrderModal('${srv.id}', '${safeName}', ${totalRate}, ${srv.min_order}, ${srv.max_order})`} 
                      class="mt-5 w-full py-2.5 bg-blue-50 dark:bg-blue-900/30 text-brand rounded-lg font-bold hover:bg-brand hover:text-white transition flex items-center justify-center text-sm border border-blue-100 dark:border-none"
                    >
                      Pilih & Lanjutkan <i data-lucide="chevron-right" class="w-4 h-4 ml-1"></i>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Pesan Error jika Filter atau Pencarian Kosong */}
            <div id="noResultMsg" class="hidden text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 mt-4 shadow-sm">
              <i data-lucide="frown" class="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-60"></i>
              <p class="font-bold text-gray-700 dark:text-gray-300">Layanan tidak ditemukan</p>
              <p class="text-xs mt-1 text-gray-400">Kata kunci atau filter kombinasi Anda tidak cocok dengan produk aktif di kategori ini.</p>
            </div>
          </div>
        )}

        {/* NOTIFIKASI KATEGORI BELUM DIPILIH */}
        {!selectedCategory && (
          <div class="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 shadow-sm">
            <i data-lucide="arrow-up-circle" class="w-14 h-14 mx-auto mb-4 text-brand/30 animate-bounce"></i>
            <h3 class="font-bold text-gray-700 dark:text-gray-200 text-base mb-1">Langkah Awal</h3>
            <p class="text-sm text-gray-500 max-w-sm mx-auto">Silakan pilih salah satu kategori di atas terlebih dahulu untuk menampilkan menu pencarian produk lengkap.</p>
          </div>
        )}

        {/* MODAL TRANSAKSI PEMESANAN */}
        <div id="orderModal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 pr-4 leading-snug" id="modalServiceName">Nama Layanan</h3>
              <button onclick="document.getElementById('orderModal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition shrink-0">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            
            <div class="overflow-y-auto p-6">
              <form id="orderForm" class="space-y-5">
                <input type="hidden" id="modalServiceId" />
                <input type="hidden" id="modalRate" />
                <div id="orderAlert" class="hidden p-3.5 rounded-lg text-sm font-medium border"></div>

                <div>
                  <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Target Pesanan (URL / Username)</label>
                  <input type="text" id="targetLink" required placeholder="Masukkan tautan target secara lengkap" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Jumlah Kuantitas</label>
                    <input type="number" id="orderQuantity" required placeholder="0" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm" />
                    <p class="text-[11px] text-gray-500 mt-1.5 font-medium flex items-center" id="modalMinMax"></p>
                  </div>
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Total Biaya Anda</label>
                    <input type="text" id="totalCost" readonly value="Rp 0" class="w-full bg-blue-50 dark:bg-gray-700 border border-blue-100 dark:border-gray-600 rounded-lg p-3 font-bold cursor-not-allowed text-brand text-sm" />
                  </div>
                </div>

                <div class="pt-2">
                  <button type="submit" id="submitOrderBtn" class="w-full bg-brand text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:opacity-90 transition-all flex items-center justify-center">
                    <i data-lucide="check" class="w-5 h-5 mr-2"></i> Konfirmasi Pembayaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* LOGIKA CLIENT-SIDE FILTERING & LIVE ENGINE */}
        <script dangerouslySetInnerHTML={{ __html: `
          let currentFilterType = 'all'; // Status filter fitur aktif

          const searchInput = document.getElementById('searchInput');
          const filterButtons = document.querySelectorAll('.filter-btn');

          // Fungsi Inti Filter Gabungan (Pencarian Teks + Tombol Fitur)
          function applyCombinedFilters() {
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const cards = document.querySelectorAll('.service-card');
            let matchCount = 0;

            cards.forEach(card => {
              const name = card.getAttribute('data-name') || '';
              const isRefill = card.getAttribute('data-is-refill') === '1';
              const isCancel = card.getAttribute('data-is-cancel') === '1';

              // 1. Cek kecocokan teks pencarian
              const matchesSearch = name.includes(searchTerm);

              // 2. Cek kecocokan tipe filter aktif
              let matchesType = true;
              if (currentFilterType === 'refill') matchesType = isRefill;
              if (currentFilterType === 'cancel') matchesType = isCancel;

              // Gabungkan aturan kueri
              if (matchesSearch && matchesType) {
                card.style.display = 'flex';
                matchCount++;
              } else {
                card.style.display = 'none';
              }
            });

            // Tampilkan info jika hasil pencarian kosong total
            const noResultMsg = document.getElementById('noResultMsg');
            if (noResultMsg) {
              if (matchCount === 0) noResultMsg.classList.remove('hidden');
              else noResultMsg.classList.add('hidden');
            }

            // Perbarui teks Counter di atas komponen grid
            const counter = document.getElementById('serviceCounter');
            if (counter) counter.textContent = 'Menampilkan: ' + matchCount;
          }

          // Listener untuk Input Teks Pencarian
          if (searchInput) {
            searchInput.addEventListener('input', applyCombinedFilters);
          }

          // Listener untuk Tombol Spesifikasi Fitur (Refill / Cancel / All)
          filterButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
              // Ganti warna status tombol aktif
              filterButtons.forEach(b => {
                b.classList.remove('bg-brand', 'text-white', 'shadow-sm');
                b.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
              });
              
              this.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
              this.classList.add('bg-brand', 'text-white', 'shadow-sm');

              currentFilterType = this.getAttribute('data-filter');
              applyCombinedFilters();
            });
          });

          // === LOGIKA OPERASIONAL MODAL ===
          function openOrderModal(id, name, rate, min, max) {
            document.getElementById('modalServiceId').value = id;
            document.getElementById('modalServiceName').textContent = name;
            document.getElementById('modalRate').value = rate;
            document.getElementById('modalMinMax').innerHTML = '<i data-lucide="info" class="w-3 h-3 mr-1"></i> Min: ' + min.toLocaleString('id-ID') + ' &bull; Max: ' + max.toLocaleString('id-ID');
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
            btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses Pembayaran...';
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
              alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="wifi-off" class="w-4 h-4 mr-2"></i>Gagal mengonfirmasi pesanan ke sistem edge worker.</div>';
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
