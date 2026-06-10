import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const actionType = body._action

    if (actionType === 'frontend') {
      const updatedSettings = {
        siteName: String(body.siteName).trim(),
        primaryColor: String(body.primaryColor).trim(),
        maintenanceMode: body.maintenanceMode === 'true'
      }
      await c.env.CONFIG_KV.put('FRONTEND_SETTINGS', JSON.stringify(updatedSettings))
      message = "Pengaturan Frontend berhasil disimpan ke KV."
      isSuccess = true
    } 
    else if (actionType === 'gateway') {
      await c.env.DB.prepare('UPDATE gateway_settings SET api_url = ?1, api_key = ?2 WHERE id = "qris"')
        .bind(String(body.api_url).trim(), String(body.api_key).trim())
        .run()
      message = "Kredensial Payment Gateway berhasil disimpan ke Database."
      isSuccess = true
    }
  }

  // Get Frontend Settings
  let configFrontend = { siteName: 'SMM Panel Pro', primaryColor: '#2563eb', maintenanceMode: false }
  try {
    const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS')
    if (kvConfigRaw) configFrontend = JSON.parse(kvConfigRaw)
  } catch (e) {}

  // Get Gateway Settings
  const gateway = await c.env.DB.prepare("SELECT * FROM gateway_settings WHERE id = 'qris'").first() || { api_url: '', api_key: '' }

  return c.render(
    <AdminLayout title="Konfigurasi Sistem">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Konfigurasi Sistem</h1>

        {message && (
          <div class={`p-4 rounded-lg font-medium text-sm mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Gateway (Database) */}
          <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <input type="hidden" name="_action" value="gateway" />
            <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center">
              <i data-lucide="server" class="w-5 h-5 mr-2 text-brand"></i> API Gateway (QRIS)
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Base URL Endpoint API</label>
                <input type="url" name="api_url" value={gateway.api_url as string} placeholder="https://..." required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-mono text-sm" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">API Key & Webhook Secret</label>
                <input type="text" name="api_key" value={gateway.api_key as string} required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-mono text-sm" />
                <p class="text-xs text-gray-500 mt-1">Kunci ini digunakan untuk Bearer Token sekaligus validasi Webhook (HMAC).</p>
              </div>
            </div>
            <button type="submit" class="w-full bg-slate-800 text-white font-semibold p-2.5 rounded-lg hover:bg-slate-700 transition mt-6">Simpan Gateway</button>
          </form>

          {/* Form Frontend (KV) */}
          <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
            <input type="hidden" name="_action" value="frontend" />
            <h2 class="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center">
              <i data-lucide="layout" class="w-5 h-5 mr-2 text-brand"></i> Visual & Website
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Nama Website</label>
                <input type="text" name="siteName" value={configFrontend.siteName} required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Status Mode Maintenance</label>
                <select name="maintenanceMode" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand">
                  <option value="false" selected={!configFrontend.maintenanceMode}>Aktif Berjalan</option>
                  <option value="true" selected={configFrontend.maintenanceMode}>Mode Perbaikan</option>
                </select>
              </div>
            </div>
            <button type="submit" class="w-full bg-brand text-white font-semibold p-2.5 rounded-lg hover:opacity-90 transition mt-6">Simpan Frontend</button>
          </form>
        </div>

      </div>
    </AdminLayout>,
    { title: 'Pengaturan' }
  )
})
