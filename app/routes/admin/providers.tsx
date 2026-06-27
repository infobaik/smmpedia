// app/routes/admin/providers.tsx
import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

const routeHandler = async (c: any) => {
  let message = null

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const slug = String(body.slug).toLowerCase().trim()
    
    try {
      await c.env.DB.prepare(`
        INSERT INTO providers (slug, name, base_url, order_body_template, check_body_template, response_mapping, api_key, secret_key)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(slug) DO UPDATE SET
          name = excluded.name,
          base_url = excluded.base_url,
          order_body_template = excluded.order_body_template,
          check_body_template = excluded.check_body_template,
          response_mapping = excluded.response_mapping,
          api_key = excluded.api_key,
          secret_key = excluded.secret_key
      `).bind(
        slug, String(body.name), String(body.base_url), 
        body.order_body_template ? String(body.order_body_template) : '{}', 
        body.check_body_template ? String(body.check_body_template) : '{}', 
        body.response_mapping ? String(body.response_mapping) : '{}',
        body.api_key ? String(body.api_key) : '',
        body.secret_key ? String(body.secret_key) : ''
      ).run()
      message = "Data Provider berhasil disimpan."
    } catch (e) {
      message = "Gagal menyimpan. Terjadi kesalahan Database."
    }
  }

  const providersData = await c.env.DB.prepare('SELECT * FROM providers ORDER BY name ASC').all()
  const providers = providersData.results || []

  return c.render(
    <AdminLayout title="Custom Providers">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Manajemen API Provider</h1>

        {message && <div class="p-4 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium mb-6">{message}</div>}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-900 dark:text-white">Tambah / Edit Provider</h2>
            <form method="POST" class="space-y-4 text-sm">
              <div>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Slug (ID Unik Huruf Kecil)</label>
                <input type="text" name="slug" required placeholder="contoh: buzzerpanel" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-brand focus:border-brand outline-none" />
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Nama Provider</label>
                <input type="text" name="name" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-brand focus:border-brand outline-none" />
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Base URL API</label>
                <input type="url" name="base_url" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-brand focus:border-brand outline-none" />
              </div>
              <div>
                <label class="block font-semibold mb-1 text-red-600 dark:text-red-400">API Key</label>
                <input type="text" name="api_key" placeholder="Wajib untuk BuzzerPanel / Provider Lain" class="w-full bg-gray-50 dark:bg-gray-900 border border-red-300 dark:border-red-700 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label class="block font-semibold mb-1 text-red-600 dark:text-red-400">Secret Key</label>
                <input type="text" name="secret_key" placeholder="Wajib untuk BuzzerPanel" class="w-full bg-gray-50 dark:bg-gray-900 border border-red-300 dark:border-red-700 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-red-500 outline-none" />
              </div>
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">Khusus Custom Provider (BuzzerPanel Kosongkan):</p>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">JSON Order Body</label>
                <textarea name="order_body_template" rows={2} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 font-mono text-xs focus:ring-brand outline-none"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">JSON Status Body</label>
                <textarea name="check_body_template" rows={2} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 font-mono text-xs focus:ring-brand outline-none"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Response Mapping JSON</label>
                <textarea name="response_mapping" rows={2} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 font-mono text-xs focus:ring-brand outline-none"></textarea>
              </div>
              <button type="submit" class="w-full bg-brand text-white font-bold py-2 rounded-lg hover:opacity-90 transition">Simpan Konfigurasi</button>
            </form>
          </div>

          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <tr>
                  <th class="px-6 py-3">Provider</th>
                  <th class="px-6 py-3">Konfigurasi URL</th>
                  <th class="px-6 py-3 text-center">Status Key</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {providers.map((p: any) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td class="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {p.name}<br/>
                      <span class="text-xs font-normal text-gray-500 dark:text-gray-400">Slug: {p.slug}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-mono truncate max-w-[200px] text-gray-700 dark:text-gray-300">{p.base_url}</td>
                    <td class="px-6 py-4 text-center">
                      <span class={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        p.api_key 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {p.api_key ? 'TERISI' : 'KOSONG'}
                      </span>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={3} class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Belum ada data provider.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>,
    { title: 'Providers' }
  )
}

export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
