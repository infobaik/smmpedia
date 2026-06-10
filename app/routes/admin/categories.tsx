// app/routes/admin/categories.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  let message = null
  let isSuccess = false

  // Logika Menambah Kategori Baru
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
    }
    // Tambahkan logika DELETE/UPDATE di sini menggunakan parameter body._action lainnya
  }

  const categoriesData = await c.env.DB.prepare('SELECT * FROM categories ORDER BY name ASC').all()
  const categories = categoriesData.results || []

  return c.render(
    <AdminLayout title="Manajemen Kategori">
      <div class="max-w-5xl mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-2xl font-bold">Katalog Kategori</h1>
            <p class="text-sm text-gray-500">Kelola master data kategori untuk produk layanan.</p>
          </div>
        </div>

        {message && (
          <div class={`p-4 rounded-lg text-sm mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah Kategori */}
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="text-lg font-bold mb-4">Tambah Baru</h2>
            <form method="POST" class="space-y-4">
              <input type="hidden" name="_action" value="create" />
              <div>
                <label class="block text-sm font-semibold mb-1">Nama Kategori</label>
                <input type="text" name="name" required placeholder="Contoh: Instagram Followers" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Deskripsi (Opsional)</label>
                <textarea name="description" rows={3} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand"></textarea>
              </div>
              <button type="submit" class="w-full bg-brand text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition">
                Simpan Kategori
              </button>
            </form>
          </div>

          {/* Tabel Daftar Kategori */}
          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-3 font-semibold">Nama Kategori</th>
                  <th class="px-6 py-3 font-semibold">Deskripsi</th>
                  <th class="px-6 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((cat: any) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 font-medium">{cat.name}</td>
                    <td class="px-6 py-4 text-gray-500">{cat.description || '-'}</td>
                    <td class="px-6 py-4 text-right">
                      <button class="text-blue-600 hover:text-blue-800 mr-3"><i data-lucide="edit" class="w-4 h-4"></i></button>
                      <button class="text-red-600 hover:text-red-800"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={3} class="px-6 py-8 text-center text-gray-500">Belum ada kategori terdaftar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>,
    { title: 'Master Kategori' }
  )
})
