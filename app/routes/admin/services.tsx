// app/routes/admin/services.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

const routeHandler = async (c: any) => {
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
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

  const [categoriesData, providersData, servicesData] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT id, name FROM categories ORDER BY name ASC'),
    c.env.DB.prepare('SELECT slug, name FROM providers WHERE status = "active" ORDER BY name ASC'),
    c.env.DB.prepare(`
      SELECT s.id, s.name, c.name as category_name, p.name as provider_name, s.rate, s.margin, s.status 
      FROM services s 
      JOIN categories c ON s.category_id = c.id 
      JOIN providers p ON s.provider_slug = p.slug
      ORDER BY c.name ASC, s.name ASC
    `)
  ])

  const categories = categoriesData.results || []
  const providers = providersData.results || []
  const services = servicesData.results || []

  return c.render(
    <AdminLayout title="Manajemen Produk">
      <div class="max-w-7xl mx-auto px-4 py-8">
        
        {/* BAGIAN HEADER YANG DIREVISI: ADA TOMBOL SINKRONISASI DI SINI */}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 class="text-2xl font-bold">Katalog Produk & Layanan</h1>
          <button id="syncMedanpediaBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center transition shadow-sm">
            <i data-lucide="refresh-cw" class="w-5 h-5 mr-2"></i> Sinkronisasi Medanpedia
          </button>
        </div>

        {message && (
          <div class={`p-4 rounded-lg text-sm mb-6 font-medium ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Notifikasi Alert untuk proses Sinkronisasi (disembunyikan secara default) */}
        <div id="syncAlertBox" class="hidden p-4 rounded-lg text-sm font-medium mb-6"></div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Tambah Manual (Opsional)</h2>
            <form method="POST" class="space-y-4">
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

          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th class="px-6 py-3 font-semibold">Layanan & Kategori</th>
                    <th class="px-6 py-3 font-semibold">Provider API</th>
                    <th class="px-6 py-3 font-semibold">Harga Jual Total</th>
                    <th class="px-6 py-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {services.map((s: any) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                        <span class={`px-2 py-1 rounded-full text-xs font-bold uppercase ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr><td colSpan={4} class="px-6 py-8 text-center text-gray-500">Belum ada layanan terdaftar. Silakan klik tombol Sinkronisasi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* LOGIKA JAVASCRIPT UNTUK MENJALANKAN TOMBOL SINKRONISASI */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('syncMedanpediaBtn')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const alertBox = document.getElementById('syncAlertBox');
            
            // Set state loading
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 mr-2 animate-spin"></i> Menarik Data Pusat...';
            lucide.createIcons();
            
            alertBox.classList.add('hidden');
            alertBox.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');

            try {
              // Tembak endpoint API backend yang kita buat di src/api/medanpedia.ts
              const response = await fetch('/api/medanpedia/sync-services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await response.json();
              
              if (data.success) {
                alertBox.textContent = data.message + ' Halaman akan dimuat ulang...';
                alertBox.classList.add('bg-green-100', 'text-green-700');
                alertBox.classList.remove('hidden');
                
                // Refresh halaman untuk melihat data terbaru di tabel
                setTimeout(() => { window.location.reload(); }, 2000);
              } else {
                alertBox.textContent = 'Gagal: ' + data.error;
                alertBox.classList.add('bg-red-100', 'text-red-700');
                alertBox.classList.remove('hidden');
                
                // Kembalikan tombol ke kondisi semula
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                lucide.createIcons();
              }
            } catch (err) {
              alertBox.textContent = 'Terjadi kesalahan jaringan atau server tidak merespons.';
              alertBox.classList.add('bg-red-100', 'text-red-700');
              alertBox.classList.remove('hidden');
              
              btn.disabled = false;
              btn.innerHTML = originalHtml;
              lucide.createIcons();
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
