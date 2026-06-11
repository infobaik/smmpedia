import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

// 1. Ekstrak seluruh logika ke dalam satu variabel fungsi pembantu (handler)
const routeHandler = async (c: any) => {
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const action = body._action

    if (action === 'create') {
      const categoryId = crypto.randomUUID()
      const name = String(body.name).trim()
      const description = String(body.description).trim()

      try {
        await c.env.DB.prepare('INSERT INTO categories (id, name, description) VALUES (?1, ?2, ?3)')
          .bind(categoryId, name, description)
          .run()
        message = "Kategori berhasil ditambahkan."
        isSuccess = true
      } catch (e) {
        message = "Gagal menambah. Pastikan nama kategori tidak duplikat."
      }

    } else if (action === 'delete') {
      const id = String(body.id)
      try {
        const check = await c.env.DB.prepare('SELECT id FROM services WHERE category_id = ?1 LIMIT 1').bind(id).first()
        
        if (check) {
          message = "Gagal menghapus: Kategori ini sedang digunakan oleh produk layanan aktif."
        } else {
          await c.env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(id).run()
          message = "Kategori berhasil dihapus selamanya."
          isSuccess = true
        }
      } catch (e) {
        message = "Gagal menghapus kategori akibat kendala sistem."
      }

    } else if (action === 'update') {
      const id = String(body.id)
      const name = String(body.name).trim()
      const description = String(body.description).trim()

      try {
        await c.env.DB.prepare('UPDATE categories SET name = ?1, description = ?2 WHERE id = ?3')
          .bind(name, description, id)
          .run()
        message = "Data kategori berhasil diperbarui."
        isSuccess = true
      } catch (e) {
        message = "Gagal memperbarui kategori. Pastikan nama tidak duplikat."
      }
    }
  }

  // ==========================================
  // LOGIKA PAGINASI SERVER-SIDE
  // ==========================================
  const url = new URL(c.req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  // Hitung total seluruh data
  const countData = await c.env.DB.prepare('SELECT COUNT(*) as total FROM categories').first()
  const totalItems = countData?.total || 0
  const totalPages = Math.ceil(totalItems / limit) || 1

  // Eksekusi data dengan batas paginasi
  const categoriesData = await c.env.DB.prepare('SELECT * FROM categories ORDER BY name ASC LIMIT ?1 OFFSET ?2')
    .bind(limit, offset)
    .all()
    
  const categories = categoriesData.results || []

  // Indikator angka paginasi
  const showingStart = totalItems === 0 ? 0 : offset + 1
  const showingEnd = Math.min(offset + limit, totalItems)

  return c.render(
    <AdminLayout title="Master Kategori">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Katalog Kategori</h1>
          <p class="text-sm text-gray-500">Kelola master data kategori untuk mengelompokkan layanan.</p>
        </div>

        {message && (
          <div class={`p-4 rounded-lg text-sm font-medium mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah Kategori */}
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Tambah Baru</h2>
            <form method="POST" class="space-y-4">
              <input type="hidden" name="_action" value="create" />
              <div>
                <label class="block text-sm font-semibold mb-1">Nama Kategori</label>
                <input type="text" name="name" required placeholder="Contoh: Instagram Followers" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Deskripsi (Opsional)</label>
                <textarea name="description" rows={3} placeholder="Penjelasan singkat..." class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm"></textarea>
              </div>
              <button type="submit" class="w-full bg-brand text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition">
                Simpan Kategori
              </button>
            </form>
          </div>

          {/* Wrapper Tabel Data & Paginasi */}
          <div class="lg:col-span-2 flex flex-col h-full">
            
            {/* Header Kontrol Paginasi */}
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between mb-4">
              <div class="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                Tampilkan
                <select 
                  onchange="window.location.href='?limit=' + this.value + '&page=1'" 
                  class="mx-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-1.5 focus:ring-brand focus:border-brand outline-none cursor-pointer"
                >
                  <option value="10" selected={limit === 10}>10</option>
                  <option value="20" selected={limit === 20}>20</option>
                  <option value="25" selected={limit === 25}>25</option>
                  <option value="50" selected={limit === 50}>50</option>
                </select>
                entri per halaman
              </div>
            </div>

            {/* Tabel Daftar Kategori */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-grow mb-4">
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th class="px-6 py-3 font-semibold">Nama Kategori</th>
                      <th class="px-6 py-3 font-semibold">Deskripsi</th>
                      <th class="px-6 py-3 font-semibold text-right">Aksi Manajemen</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    {categories.map((cat: any) => (
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td class="px-6 py-4 font-bold text-gray-900 dark:text-white">{cat.name}</td>
                        <td class="px-6 py-4 text-gray-500">{cat.description || '-'}</td>
                        <td class="px-6 py-4 text-right">
                          <div class="flex justify-end space-x-2">
                            <button 
                              onclick={`openEditModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', '${(cat.description || '').replace(/'/g, "\\'")}')`}
                              class="text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 hover:bg-blue-100 p-2 rounded-lg transition"
                              title="Edit Kategori"
                            >
                              <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            
                            <form method="POST" onsubmit="return confirm('Yakin ingin menghapus kategori ini secara permanen?')" class="inline">
                              <input type="hidden" name="_action" value="delete" />
                              <input type="hidden" name="id" value={cat.id} />
                              <button type="submit" class="text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/30 dark:hover:bg-red-800/50 hover:bg-red-100 p-2 rounded-lg transition" title="Hapus Kategori">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={3} class="px-6 py-8 text-center text-gray-500">Belum ada kategori terdaftar di halaman ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Kontrol Paginasi (Prev/Next) */}
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan <span class="font-bold text-gray-900 dark:text-white">{showingStart}</span> sampai <span class="font-bold text-gray-900 dark:text-white">{showingEnd}</span> dari <span class="font-bold text-gray-900 dark:text-white">{totalItems}</span> entri
              </span>
              
              <div class="flex items-center space-x-2">
                <a 
                  href={page <= 1 ? '#' : `?page=${page - 1}&limit=${limit}`} 
                  class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  onclick={page <= 1 ? "event.preventDefault()" : ""}
                >
                  Sebelumnya
                </a>
                
                <div class="px-4 py-2 text-sm font-bold bg-brand text-white rounded-lg shadow-sm">
                  {page} / {totalPages}
                </div>

                <a 
                  href={page >= totalPages ? '#' : `?page=${page + 1}&limit=${limit}`} 
                  class={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors ${page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  onclick={page >= totalPages ? "event.preventDefault()" : ""}
                >
                  Selanjutnya
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Edit (Tetap dipertahankan seutuhnya) */}
        <div id="editModal" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 class="font-bold text-lg text-gray-900 dark:text-white">Ubah Data Kategori</h3>
              <button onclick="document.getElementById('editModal').classList.add('hidden')" class="text-gray-500 hover:text-gray-800 dark:hover:text-white transition">
                <i data-lucide="x" class="w-6 h-6"></i>
              </button>
            </div>
            
            <form method="POST" class="p-6 space-y-4">
              <input type="hidden" name="_action" value="update" />
              <input type="hidden" name="id" id="edit_id" />
              
              <div>
                <label class="block text-sm font-semibold mb-1">Nama Kategori</label>
                <input type="text" name="name" id="edit_name" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm" />
              </div>
              
              <div>
                <label class="block text-sm font-semibold mb-1">Deskripsi</label>
                <textarea name="description" id="edit_description" rows={3} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand text-sm"></textarea>
              </div>
              
              <button type="submit" class="w-full bg-brand text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition mt-4">
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          function openEditModal(id, name, desc) {
            document.getElementById('edit_id').value = id;
            document.getElementById('edit_name').value = name;
            document.getElementById('edit_description').value = desc;
            document.getElementById('editModal').classList.remove('hidden');
          }
        `}} />

      </div>
    </AdminLayout>,
    { title: 'Master Kategori' }
  )
}

// 2. DAFTARKAN HANDLER UNTUK KEDUA METODE (SANGAT KRUSIAL)
export const POST = createRoute(routeHandler)
export default createRoute(routeHandler) // Ini untuk metode GET
