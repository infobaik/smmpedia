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

  // 3. Ambil seluruh daftar kategori
  const categoriesData = await c.env.DB.prepare(`
    SELECT id, name FROM categories ORDER BY name ASC
  `).all()
  const categories = categoriesData.results || []

  // Cari nama kategori yang sedang dipilih (untuk ditampilkan di input pencarian)
  const activeCategoryObj = categories.find((cat: any) => cat.id === selectedCategory)
  const activeCategoryName = activeCategoryObj ? activeCategoryObj.name : ''

  // 4. Ambil daftar layanan jika kategori dipilih
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
          <p class="text-sm text-gray-500 mt-1">Gunakan fitur pencarian pintar untuk menemukan kategori dan layanan dengan cepat.</p>
        </div>

        {/* KOTAK UTAMA: SELEKSI KATEGORI & FILTER */}
        <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5 relative z-20">
          
          {/* BAGIAN 1: PENCARIAN & PEMILIHAN KATEGORI (CUSTOM DROPDOWN) */}
          <div id="categorySelectContainer" class="relative">
            <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center">
              <span class="w-5 h-5 bg-brand text-white text-xs flex items-center justify-center rounded-full mr-2">1</span>
              Cari & Pilih Kategori
            </label>
            
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i data-lucide="search" class="w-5 h-5 text-gray-400"></i>
              </div>
              <input 
                type="text" 
                id="categorySearchInput" 
                placeholder="Ketik untuk mencari dari ribuan kategori..." 
                value={activeCategoryName}
                autocomplete="off"
                class="w-full bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-brand font-semibold transition-colors cursor-text text-gray-900 dark:text-white shadow-sm"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400"></i>
              </div>
            </div>
            
            {/* Dropdown List Kategori (Hidden by default) */}
            <div id="categoryDropdown" class="hidden absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto z-50">
              {categories.length === 0 ? (
                <div class="p-4 text-center text-gray-500 text-sm">Tidak ada kategori tersedia.</div>
              ) : (
                <ul class="py-1">
                  {categories.map((cat: any) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <li 
                        class={`category-item px-4 py-2.5 text-sm cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${isSelected ? 'bg-blue-50 dark:bg-gray-700 font-bold text-brand' : 'text-gray-700 dark:text-gray-200'}`}
                        data-id={cat.id}
                        data-name={cat.name.toLowerCase()}
                      >
                        <span class="line-clamp-1 pr-2">{cat.name}</span>
                        {isSelected && <i data-lucide="check" class="w-4 h-4 text-brand shrink-0"></i>}
                      </li>
                    )
                  })}
                  <li id="noCategoryMsg" class="hidden px-4 py-3 text-sm text-center text-gray-500">Kategori tidak ditemukan.</li>
                </ul>
              )}
            </div>
          </div>

          {/* BAGIAN 2: FILTER PENCARIAN LAYANAN */}
          {selectedCategory && services.length > 0 && (
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
              <div>
                <label class="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                  <span class="w-5 h-5 bg-brand text-white text-xs flex items-center justify-center rounded-full mr-2">2</span>
                  Filter Layanan
                </label>
                <div class="relative mb-3">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <i data-lucide="filter" class="w-5 h-5 text-gray-400"></i>
                  </div>
                  <input 
                    type="text" 
                    id="serviceSearchInput" 
                    placeholder="Saring nama layanan (cth: 'Indo', 'Likes')..." 
                    class="w-full bg-gray-50 border border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded-lg p-2.5 pl-10 outline-none focus:ring-2 focus:ring-brand text-sm transition-colors"
                  />
                </div>
                
                <div class="flex flex-wrap gap-2" id="filterBadgeGroup">
                  <button type="button" data-filter="all" class="filter-btn bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm">Semua</button>
                  <button type="button" data-filter="refill" class="filter-btn bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-all">🔥 Refill</button>
                  <button type="button" data-filter="cancel" class="filter-btn bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-all">❌ Cancelable</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTAINER LAYANAN YANG TERSEDIA */}
        {selectedCategory && services.length > 0 && (
          <div class="mb-10 relative z-10">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                <i data-lucide="layers" class="w-5 h-5 mr-2 text-brand"></i> Daftar Layanan
              </h2>
              <span id="serviceCounter" class="text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
                Total: {services.length}
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
                          <span>Harga / 1K</span>
                          <strong class="text-brand text-sm font-extrabold">Rp {totalRate.toLocaleString('id-ID')}</strong>
                        </div>
                        <div class="flex justify-between items-center px-1 pt-1">
                          <span>Min. Order</span>
                          <span class="text-gray-700 dark:text-gray-300 font-semibold">{srv.min_order.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between items-center px-1">
                          <span>Max. Order</span>
                          <span class="text-gray-700 dark:text-gray-300 font-semibold">{srv.max_order.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onclick={`openOrderModal('${srv.id}', '${safeName}', ${totalRate}, ${srv.min_order}, ${srv.max_order})`} 
                      class="mt-5 w-full py-2.5 bg-blue-50 dark:bg-blue-900/30 text-brand rounded-lg font-bold hover:bg-brand hover:text-white transition flex items-center justify-center text-sm border border-blue-100 dark:border-none"
                    >
                      Pilih Layanan
                    </button>
                  </div>
                )
              })}
            </div>

            <div id="noResultMsg" class="hidden text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 mt-4 shadow-sm">
              <i data-lucide="frown" class="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-60"></i>
              <p class="font-bold text-gray-700 dark:text-gray-300">Layanan tidak ditemukan</p>
              <p class="text-xs mt-1 text-gray-400">Tidak ada layanan yang cocok dengan filter pencarian Anda.</p>
            </div>
          </div>
        )}

        {/* NOTIFIKASI KATEGORI KOSONG / BELUM DIPILIH */}
        {selectedCategory && services.length === 0 && (
          <div class="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 shadow-sm relative z-10">
            <i data-lucide="package-open" class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"></i>
            <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori Kosong</h3>
            <p class="text-sm">Saat ini tidak ada layanan yang aktif di kategori ini.</p>
          </div>
        )}

        {!selectedCategory && (
          <div class="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 shadow-sm relative z-10">
            <i data-lucide="search" class="w-14 h-14 mx-auto mb-4 text-brand/30"></i>
            <h3 class="font-bold text-gray-700 dark:text-gray-200 text-base mb-1">Cari Kategori Terlebih Dahulu</h3>
            <p class="text-sm text-gray-500 max-w-sm mx-auto">Silakan ketik dan pilih kategori pada kotak pencarian di atas untuk memunculkan daftar layanan.</p>
          </div>
        )}

        {/* MODAL TRANSAKSI PEMESANAN */}
        <div id="orderModal" class="hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Target URL / Username</label>
                  <input type="text" id="targetLink" required placeholder="Masukkan tautan target secara lengkap" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Jumlah Pesanan</label>
                    <input type="number" id="orderQuantity" required placeholder="0" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand text-sm" />
                    <p class="text-[11px] text-gray-500 mt-1.5 font-medium flex items-center" id="modalMinMax"></p>
                  </div>
                  <div>
                    <label class="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Total Biaya</label>
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

        {/* LOGIKA CLIENT-SIDE SCRIPTS */}
        <script dangerouslySetInnerHTML={{ __html: `
          // === LOGIKA PENCARIAN KATEGORI (CUSTOM DROPDOWN) ===
          const catInput = document.getElementById('categorySearchInput');
          const catDropdown = document.getElementById('categoryDropdown');
          const catItems = document.querySelectorAll('.category-item');
          const noCatMsg = document.getElementById('noCategoryMsg');

          if (catInput) {
            // Tampilkan dropdown saat input difokuskan
            catInput.addEventListener('focus', () => {
              catDropdown.classList.remove('hidden');
              catInput.select(); // Pilih semua teks saat diklik agar mudah dihapus
            });

            // Filter Kategori saat mengetik
            catInput.addEventListener('input', (e) => {
              const term = e.target.value.toLowerCase();
              let visibleCount = 0;
              
              catItems.forEach(item => {
                const name = item.getAttribute('data-name');
                if (name.includes(term)) {
                  item.style.display = 'flex';
                  visibleCount++;
                } else {
                  item.style.display = 'none';
                }
              });

              if (visibleCount === 0) noCatMsg.classList.remove('hidden');
              else noCatMsg.classList.add('hidden');
            });

            // Klik di luar untuk menutup dropdown
            document.addEventListener('click', (e) => {
              if (!e.target.closest('#categorySelectContainer')) {
                catDropdown.classList.add('hidden');
              }
            });

            // Aksi saat item kategori diklik
            catItems.forEach(item => {
              item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                window.location.href = '?category=' + id;
              });
            });
          }


          // === LOGIKA FILTER LAYANAN (PENCARIAN TEKS + STATUS) ===
          let currentFilterType = 'all'; 
          const serviceSearchInput = document.getElementById('serviceSearchInput');
          const filterButtons = document.querySelectorAll('.filter-btn');

          function applyCombinedFilters() {
            const searchTerm = serviceSearchInput ? serviceSearchInput.value.toLowerCase() : '';
            const cards = document.querySelectorAll('.service-card');
            let matchCount = 0;

            cards.forEach(card => {
              const name = card.getAttribute('data-name') || '';
              const isRefill = card.getAttribute('data-is-refill') === '1';
              const isCancel = card.getAttribute('data-is-cancel') === '1';

              const matchesSearch = name.includes(searchTerm);
              let matchesType = true;
              if (currentFilterType === 'refill') matchesType = isRefill;
              if (currentFilterType === 'cancel') matchesType = isCancel;

              if (matchesSearch && matchesType) {
                card.style.display = 'flex';
                matchCount++;
              } else {
                card.style.display = 'none';
              }
            });

            const noResultMsg = document.getElementById('noResultMsg');
            if (noResultMsg) {
              if (matchCount === 0) noResultMsg.classList.remove('hidden');
              else noResultMsg.classList.add('hidden');
            }

            const counter = document.getElementById('serviceCounter');
            if (counter) counter.textContent = 'Menampilkan: ' + matchCount;
          }

          if (serviceSearchInput) {
            serviceSearchInput.addEventListener('input', applyCombinedFilters);
          }

          filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
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


          // === LOGIKA OPERASIONAL MODAL PEMESANAN ===
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
                alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="check-circle" class="w-4 h-4 mr-2"></i>' + result.message + '</div>';
                alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 block';
                lucide.createIcons();
                setTimeout(() => { window.location.href = '/history'; }, 1500);
              } else {
                alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i>' + result.error + '</div>';
                alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 block';
                lucide.createIcons();
              }
            } catch (err) {
              alertBox.innerHTML = '<div class="flex items-center"><i data-lucide="wifi-off" class="w-4 h-4 mr-2"></i>Gagal mengonfirmasi pesanan.</div>';
              alertBox.className = 'p-3.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 block';
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
