import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

const routeHandler = async (c: any) => {
  let message = null

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const slug = String(body.slug).toLowerCase().trim()
    
    try {
      await c.env.DB.prepare(`
        INSERT INTO providers (slug, name, base_url, order_body_template, check_body_template, response_mapping)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      `).bind(
        slug, String(body.name), String(body.base_url), 
        String(body.order_body_template), String(body.check_body_template), String(body.response_mapping)
      ).run()
      message = "Provider berhasil ditambahkan."
    } catch (e) {
      message = "Gagal menyimpan. Pastikan Slug/ID Provider unik."
    }
  }

  const providersData = await c.env.DB.prepare('SELECT * FROM providers ORDER BY name ASC').all()
  const providers = providersData.results || []

  return c.render(
    <AdminLayout title="Custom Providers">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Manajemen API Provider</h1>

        {message && <div class="p-4 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium mb-6">{message}</div>}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="font-bold mb-4 border-b pb-2">Tambah Provider Baru</h2>
            <form method="POST" class="space-y-4 text-sm">
              <div>
                <label class="block font-semibold mb-1">Nama Provider</label>
                <input type="text" name="name" required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>
              <div>
                <label class="block font-semibold mb-1">Slug (ID Unik Huruf Kecil)</label>
                <input type="text" name="slug" required placeholder="contoh: rajasosmed" class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>
              <div>
                <label class="block font-semibold mb-1">Base URL API</label>
                <input type="url" name="base_url" required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>
              <div>
                <label class="block font-semibold mb-1">Template JSON Order Body</label>
                <textarea name="order_body_template" rows={2} required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 font-mono text-xs"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1">Template JSON Status/Check</label>
                <textarea name="check_body_template" rows={2} required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 font-mono text-xs"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1">Response Mapping JSON</label>
                <textarea name="response_mapping" rows={2} required placeholder='{"order_id_key": "id", "status_key": "status"}' class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 font-mono text-xs"></textarea>
              </div>
              <button type="submit" class="w-full bg-brand text-white font-bold py-2 rounded-lg">Simpan Provider</button>
            </form>
          </div>

          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-6 py-3">Nama</th>
                  <th class="px-6 py-3">Base URL</th>
                  <th class="px-6 py-3">Webhook URL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {providers.map((p: any) => (
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-bold">{p.name}<br/><span class="text-xs font-normal text-gray-500">Slug: {p.slug}</span></td>
                    <td class="px-6 py-4 text-xs font-mono truncate max-w-[200px]">{p.base_url}</td>
                    <td class="px-6 py-4 text-xs font-mono text-brand">/api/webhook/{p.slug}</td>
                  </tr>
                ))}
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
