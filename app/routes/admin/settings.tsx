import { createRoute } from 'honox/factory'
import AdminLayout from '../../components/AdminLayout'

export default createRoute(async (c) => {
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const updatedSettings = {
      qrisApiUrl: String(body.qrisApiUrl).trim(),
      qrisApiKey: String(body.qrisApiKey).trim(),
      qrisWebhookSecret: String(body.qrisWebhookSecret).trim()
    }
    
    await c.env.CONFIG_KV.put('GATEWAY_SETTINGS', JSON.stringify(updatedSettings))
    message = "Pengaturan Payment Gateway berhasil disimpan."
    isSuccess = true
  }

  let config = { qrisApiUrl: '', qrisApiKey: '', qrisWebhookSecret: '' }
  try {
    const kvConfigRaw = await c.env.CONFIG_KV.get('GATEWAY_SETTINGS')
    if (kvConfigRaw) config = JSON.parse(kvConfigRaw)
  } catch (e) {}

  return c.render(
    <AdminLayout title="Pengaturan Gateway">
      <div class="max-w-3xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Konfigurasi Payment Gateway (QRIS)</h1>

        {message && (
          <div class={`p-4 rounded-lg font-medium text-sm mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold mb-2">Base URL API Gateway</label>
              <input type="url" name="qrisApiUrl" value={config.qrisApiUrl} placeholder="https://..." class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-mono text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-2">API Key (Bearer Token)</label>
              <input type="text" name="qrisApiKey" value={config.qrisApiKey} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-mono text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-2">Webhook Secret Key (Untuk Validasi HMAC)</label>
              <input type="text" name="qrisWebhookSecret" value={config.qrisWebhookSecret} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand font-mono text-sm" />
            </div>
          </div>
          <button type="submit" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition mt-6">
            Simpan Konfigurasi ke KV
          </button>
        </form>
      </div>
    </AdminLayout>,
    { title: 'Pengaturan' }
  )
})
