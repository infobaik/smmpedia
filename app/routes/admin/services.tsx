// app/routes/admin/services.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  // Mengambil referensi lookup untuk dropdown (Hanya Master Data)
  const [categoriesData, providersData] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT id, name FROM categories ORDER BY name ASC'),
    c.env.DB.prepare('SELECT slug, name FROM providers WHERE status = "active" ORDER BY name ASC')
  ])

  const categories = categoriesData.results || []
  const providers = providersData.results || []

  // ... (Logika POST handler untuk menyimpan produk ke tabel services) ...

  return c.render(
    <AdminLayout title="Manajemen Produk">
      <div class="max-w-5xl mx-auto px-4 py-8">
        
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
          <h2 class="text-lg font-bold mb-4">Tambah Produk/Layanan Baru</h2>
          
          <form method="POST" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Dropdown Master Kategori (Terhindar dari typo) */}
              <div>
                <label class="block text-sm font-semibold mb-1">Kategori</label>
                <select name="category_id" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand">
                  <option value="" disabled selected>-- Pilih Kategori --</option>
                  {categories.map((cat: any) => (
                    <option value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown Master Provider (Sistem mengetahui API mana yang akan ditembak) */}
              <div>
                <label class="block text-sm font-semibold mb-1">Provider Pusat</label>
                <select name="provider_slug" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand">
                  <option value="" disabled selected>-- Pilih Provider --</option>
                  {providers.map((prov: any) => (
                    <option value={prov.slug}>{prov.name}</option>
                  ))}
                </select>
              </div>

            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Nama Layanan</label>
                <input type="text" name="name" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
              </div>
              
              {/* Kode unik yang diminta oleh API Pusat */}
              <div>
                <label class="block text-sm font-semibold mb-1">Provider Service ID (Kode di Pusat)</label>
                <input type="text" name="product_provider_id" required placeholder="Contoh: 102 atau SV-01" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
              </div>
            </div>

            {/* Input Harga, Margin, Min/Max (Dihilangkan untuk mempersingkat kode contoh) */}

            <button type="submit" class="bg-brand text-white font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 transition">
              Simpan Produk
            </button>
          </form>
        </div>

      </div>
    </AdminLayout>,
    { title: 'Master Produk' }
  )
})
