// app/routes/admin.tsx
import { createRoute } from 'honox/factory'
import Navbar from '../components/Navbar'

export default createRoute(async (c) => {
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    try {
      const body = await c.req.parseBody()
      const updatedSettings = {
        siteName: body.siteName,
        primaryColor: body.primaryColor,
        maintenanceMode: body.maintenanceMode === 'true'
      }
      
      await c.env.CONFIG_KV.put('FRONTEND_SETTINGS', JSON.stringify(updatedSettings))
      message = "Pengaturan berhasil disimpan ke Cloudflare KV."
      isSuccess = true
    } catch (error) {
      message = "Gagal menyimpan pengaturan."
      isSuccess = false
    }
  }

  let config = {
    siteName: 'SMM Panel Pro',
    primaryColor: '#2563eb',
    maintenanceMode: false
  }

  try {
    const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS')
    if (kvConfigRaw) config = JSON.parse(kvConfigRaw)
  } catch (e) {}

  return c.render(
    <div>
      <Navbar />
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center space-x-3 mb-6 border-b pb-4 dark:border-gray-700">
            <i data-lucide="sliders" class="text-brand w-6 h-6"></i>
            <h1 class="text-xl font-bold">Pengaturan Global Frontend</h1>
          </div>

          {message && (
            <div class={`p-4 rounded-lg font-medium text-sm mb-6 ${isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {message}
            </div>
          )}

          <form method="POST" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold mb-2">Nama Platform Situs</label>
              <input type="text" name="siteName" value={config.siteName} required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Warna Utama Brand (Hex Code)</label>
              <div class="flex space-x-2">
                <input type="color" name="primaryColor" value={config.primaryColor} class="h-11 w-14 bg-gray-50 border border-gray-300 dark:border-gray-600 rounded-lg p-1 cursor-pointer" />
                <input type="text" value={config.primaryColor} readonly class="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none font-mono" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Status Operasional Situs</label>
              <select name="maintenanceMode" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand">
                <option value="false" selected={!config.maintenanceMode}>Aktif Penuh</option>
                <option value="true" selected={config.maintenanceMode}>Mode Pemeliharaan (Maintenance)</option>
              </select>
            </div>

            <button type="submit" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition mt-4">
              Simpan Perubahan ke Cloudflare KV
            </button>
          </form>
        </div>
      </div>
    </div>,
    { title: 'Admin Pengaturan' }
  )
})
