// app/routes/admin/services.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

const routeHandler = async (c: any) => {
  let message = null
  let isSuccess = false

  // ==========================================
  // LOGIKA CRUD (POST)
  // ==========================================
  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const action = body._action || 'create' // Default aksi adalah create

    // AKSI: MENGHAPUS LAYANAN
    if (action === 'delete') {
      const id = String(body.id)
      try {
        await c.env.DB.prepare('DELETE FROM services WHERE id = ?1').bind(id).run()
        message = "Produk layanan berhasil dihapus dari sistem."
        isSuccess = true
      } catch (e) {
        message = "Gagal menghapus produk layanan."
      }
    } 
    // AKSI: MENAMBAH LAYANAN MANUAL
    else if (action === 'create') {
      const id = `srv_${crypto.randomUUID().substring(0, 8)}`
      
      try {
        await c.env.DB.prepare(`
          INSERT INTO services (id, category_id, provider_slug, product_provider_id, name, type, rate, margin, min_order, max_order, status)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'active')
        `).bind(
          id, String(body.category_id), String(body.provider_slug), String(body.product_provider_id),
          String(body.name), String(body.type || 'Default'), 
          parseFloat(String(body.rate)), parseFloat(String(body.margin || 0)), 
          parseInt(String(body.min_order)), parseInt(String(body.max_order))
        ).run()
        
        message = "Produk layanan berhasil ditambahkan secara manual."
        isSuccess = true
      } catch (e) {
        message = "Gagal menyimpan produk layanan. Periksa kembali isian Anda."
      }
    }
  }

  // ==========================================
  // LOGIKA PAGINASI & PENCARIAN (SERVER-SIDE)
  // ==========================================
  const url = new URL(c.req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const searchQuery = url.searchParams.get('q') || ''
  const offset = (page - 1) * limit

  const categoriesData = await c.env.DB.prepare('SELECT id, name FROM categories ORDER BY name ASC').all()
  const providersData = await c.env.DB.prepare('SELECT slug, name FROM providers WHERE status = "active" ORDER BY name ASC').all()
  
  const categories = categoriesData.results || []
  const providers = providersData.results || []

  let totalItems = 0
  let services = []

  if (searchQuery) {
    const countData = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM services s
      JOIN categories c ON s.category_id = c.id
      WHERE s.name LIKE ?1 OR c.name LIKE ?1
    `).bind(`%${searchQuery}%`).first()
    totalItems = countData?.total || 0

    const servicesData = await c.env.DB.prepare(`
      SELECT s.id, s.name, c.name as category_name, p.name as provider_name, s.rate, s.margin, s.status 
      FROM services s 
      JOIN categories c ON s.category_id = c.id 
      JOIN providers p ON s.provider_slug = p.slug
      WHERE s.name LIKE ?1 OR c.name LIKE ?1
      ORDER BY c.name ASC, s.name ASC
      LIMIT ?2 OFFSET ?3
    `).bind(`%${searchQuery}%`, limit, offset).all()
    services = servicesData.results || []
  } else {
    const countData = await c.env.DB.prepare('SELECT COUNT(*) as total FROM services').first()
    totalItems = countData?.total || 0

    const servicesData = await c.env.DB.prepare(`
      SELECT s.id, s.name, c.name as category_name, p.name as provider_name, s.rate, s.margin, s.status 
      FROM services s 
      JOIN categories c ON s.category_id = c.id 
      JOIN providers p ON s.provider_slug = p.slug
      ORDER BY c.name ASC, s.name ASC
      LIMIT ?1 OFFSET ?2
    `).bind(limit, offset).all()
    services = servicesData.results || []
  }

  const totalPages = Math.ceil(totalItems / limit) || 1
  const showingStart = totalItems === 0 ? 0 : offset + 1
  const showingEnd = Math.min(offset + limit, totalItems)

  return c.render(
    <AdminLayout title="Manajemen Produk">
      <div class="max-w-7xl mx-auto px-4 py-8">
        
        {/* HEADER */}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 class="text-2xl font-bold">Katalog Produk & Layanan</h1>
          <button id="syncBuzzerpanelBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center transition shadow-sm">
            <i data-lucide="refresh-cw" class="w-5 h-5 mr-2"></i> Sinkronisasi BuzzerPanel
          </button>
        </div>

        {message && (
          <div class={`p-4 rounded-lg text-sm mb-6 font-medium ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div id="syncAlertBox" class="hidden p-4 rounded-lg text-sm font-medium mb-6"></div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORM TAMBAH MANUAL */}
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Tambah Manual (Opsional)</h2>
            <form method="POST" class="space-y-4">
              <input type="hidden" name="_action" value="create" />
              
              <div>
                <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Master Kategori</label>
                <select name="category_id" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm">
                  <option value="" disabled selected>-- Pilih Kategori --</option>
                  {categories.map((cat: any) => <option value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Provider Pusat</label>
                <select name="provider_slug" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm">
                  <option value="" disabled selected>-- Pilih Provider API --</option>
                  {providers.map((prov: any) => <option value={prov.slug}>{prov.name}</option>)}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Nama Layanan</label>
                <input type="text" name="name" required placeholder="Contoh: Instagram Followers [Real]" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Provider Service ID</label>
                <input type="text" name="product_provider_id" required placeholder="Kode ID di server pusat" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm font-mono" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Harga Modal</label>
                  <input type="number" step="0.01" name="rate" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Margin Profit</label>
                  <input type="number" step="0.01" name="margin" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Min Order</label>
                  <input type="number" name="min_order" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold mb-1 uppercase text-gray-500">Max Order</label>
                  <input type="number" name="max_order" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>
              </div>

              <button type="submit" class="w-full bg-brand text-white font-bold py-3 rounded-lg hover:opacity-90 transition mt-2">
                Simpan Produk
              </button>
            </form>
          </div>

          <div class="lg:col-span-2 flex flex-col h-full">
            
            {/* PANEL KONTROL HEADER */}
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div class="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                Tampilkan
                <select 
                  onchange={`window.location.href='?limit=' + this.value + '&page=1&q=${encodeURIComponent(searchQuery)}'`} 
                  class="mx-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-1.5 focus:ring-brand focus:border-brand outline-none cursor-pointer"
                >
                  <option value="10" selected={limit === 10}>10</option>
                  <option value="20" selected={limit === 20}>20</option>
                  <option value="25" selected={limit === 25}>25</option>
                  <option value="50" selected={limit === 50}>50</option>
                </select>
                entri
              </div>

              <form method="GET" class="flex items-center w-full sm:w-auto">
                <input type="hidden" name="limit" value={limit} />
                <div class="relative w-full sm:w-64">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                  </div>
                  <input 
                    type="text" 
                    name="q" 
                    value={searchQuery} 
                    placeholder="Cari produk atau kategori..." 
                    class="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-brand focus:border-brand outline-none"
                  />
                </div>
                <button type="submit" class="ml-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition">
                  Cari
                </button>
                {searchQuery && (
                  <a href={`?limit=${limit}&page=1`} class="ml-2 text-red-500 hover:text-red-700 text-sm font-medium transition" title="Reset Pencarian">
                    Reset
                  </a>
                )}
              </form>
            </div>

            {/* TABEL DATA LAYANAN */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-grow mb-4">
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th class="px-6 py-3 font-semibold">Layanan & Kategori</th>
                      <th class="px-6 py-3 font-semibold">Provider API</th>
                      <th class="px-6 py-3 font-semibold">Harga Jual Total</th>
                      <th class="px-6 py-3 font-semibold text-center">Status</th>
                      <th class="px-6 py-3 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    {services.map((s: any) => (
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td class="px-6 py-4">
                          <div class="font-bold text-gray-900 dark:text-white leading-tight">{s.name}</div>
                          <div class="text-xs text-gray-500 mt-1">{s.category_name}</div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                            {s.provider_name}
                          </span>
                        </td>
                        <td class="px-6 py-4 font-medium text-brand">
                          Rp {(s.rate + s.margin).toLocaleString('id-ID')}
                          <div class="text-[10px] text-gray-400 font-normal mt-0.5">Modal: Rp {s.rate.toLocaleString('id-ID')}</div>
                        </td>
                        <td class="px-6 py-4 text-center">
                          <span class={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                          <form method="POST" onsubmit="return confirm('Yakin ingin menghapus layanan ini secara permanen?')" class="inline">
                            <input type="hidden" name="_action" value="delete" />
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" class="text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/30 dark:hover:bg-red-800/50 hover:bg-red-100 p-2 rounded-lg transition" title="Hapus Layanan">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan={5} class="px-6 py-8 text-center text-gray-500">
                          {searchQuery ? `Tidak ada produk yang cocok dengan kata kunci "${searchQuery}".` : 'Belum ada layanan terdaftar. Silakan klik tombol Sinkronisasi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL FOOTER: NAVIGASI CONTROLLER */}
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan <span class="font-bold text-gray-900 dark:text-white">{showingStart}</span> sampai <span class="font-bold text-gray-900 dark:text-white">{showingEnd}</span> dari <span class="font-bold text-gray-900 dark:text-white">{totalItems}</span> entri
              </span>
              
              <div class="flex items-center space-x-2">
                <a 
                  href={page <= 1 ? '#' : `?page=${page - 1}&limit=${limit}&q=${encodeURIComponent(searchQuery)}`} 
                  class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  onclick={page <= 1 ? "event.preventDefault()" : ""}
                >
                  Sebelumnya
                </a>
                
                <div class="px-4 py-2 text-sm font-bold bg-brand text-white rounded-lg shadow-sm">
                  {page} / {totalPages}
                </div>

                <a 
                  href={page >= totalPages ? '#' : `?page=${page + 1}&limit=${limit}&q=${encodeURIComponent(searchQuery)}`} 
                  class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  onclick={page >= totalPages ? "event.preventDefault()" : ""}
                >
                  Selanjutnya
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* LOGIKA JAVASCRIPT TOMBOL SINKRONISASI BUZZERPANEL */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('syncBuzzerpanelBtn')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const alertBox = document.getElementById('syncAlertBox');
            
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 mr-2 animate-spin"></i> Menarik Data Pusat...';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            alertBox.classList.add('hidden');
            alertBox.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');

            try {
              const response = await fetch('/api/buzzerpanel/sync-services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await response.json();
              
              if (data.success) {
                alertBox.textContent = data.message + ' Halaman akan dimuat ulang...';
                alertBox.classList.add('bg-green-100', 'text-green-700');
                alertBox.classList.remove('hidden');
                
                setTimeout(() => { window.location.reload(); }, 2000);
              } else {
                alertBox.textContent = 'Gagal: ' + data.error;
                alertBox.classList.add('bg-red-100', 'text-red-700');
                alertBox.classList.remove('hidden');
                
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
              }
            } catch (err) {
              alertBox.textContent = 'Terjadi kesalahan jaringan atau server tidak merespons.';
              alertBox.classList.add('bg-red-100', 'text-red-700');
              alertBox.classList.remove('hidden');
              
              btn.disabled = false;
              btn.innerHTML = originalHtml;
              if (typeof lucide !== 'undefined') lucide.createIcons();
            }
          });
        `}} />

      </div>
    </AdminLayout>,
    { title: 'Master Produk' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
