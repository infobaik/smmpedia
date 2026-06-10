// app/routes/developer.tsx
import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    if (body.action === 'generate_api') {
      const newApiKey = `sp_${crypto.randomUUID().replace(/-/g, '')}`
      await c.env.DB.prepare('UPDATE users SET api_key = ?1 WHERE id = ?2').bind(newApiKey, userSession.userId).run()
      message = "API Key baru berhasil di-generate!"
      isSuccess = true
    } else if (body.action === 'save_webhook') {
      await c.env.DB.prepare('UPDATE users SET webhook_url = ?1 WHERE id = ?2').bind(String(body.webhook_url), userSession.userId).run()
      message = "Endpoint Webhook berhasil disimpan."
      isSuccess = true
    } else if (body.action === 'generate_referral') {
      const newRefCode = crypto.randomUUID().substring(0, 8).toUpperCase()
      await c.env.DB.prepare('UPDATE users SET referral_code = ?1 WHERE id = ?2').bind(newRefCode, userSession.userId).run()
      message = "Kode Referral berhasil diaktifkan!"
      isSuccess = true
    }
  }

  const user = await c.env.DB.prepare('SELECT balance, api_key, webhook_url, referral_code, commission_balance FROM users WHERE id = ?1').bind(userSession.userId).first()
  const balance = user?.balance || 0

  const protocol = c.req.header('x-forwarded-proto') || 'https'
  const domain = c.req.header('host')
  const baseUrl = `${protocol}://${domain}`
  
  const referralLink = user?.referral_code ? `${baseUrl}/register?ref=${user.referral_code}` : ''

  return c.render(
    <MemberLayout title="Developer & API" balance={balance}>
      <div class="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        
        <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pusat Integrasi & Referral</h1>
          <p class="text-sm text-gray-500 mt-1">Kelola akses API Anda dan integrasikan layanan SMMPedia langsung ke sistem Anda.</p>
        </div>

        {message && (
          <div class={`p-4 rounded-xl text-sm font-bold ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <i data-lucide="info" class="w-4 h-4 inline mr-2"></i>{message}
          </div>
        )}

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KOLOM API & WEBHOOK */}
          <div class="space-y-6">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 class="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                <i data-lucide="code" class="w-5 h-5 mr-2 text-brand"></i> Kredensial API v1
              </h2>
              {user?.api_key ? (
                <div class="space-y-4">
                  <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">API Key Anda</label>
                    <div class="flex mt-1">
                      <input type="text" readonly value={user.api_key} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-l-lg p-2.5 font-mono text-sm outline-none" />
                      <button onclick={`navigator.clipboard.writeText('${user.api_key}')`} class="bg-brand text-white px-4 rounded-r-lg hover:opacity-90 font-bold text-sm transition">Copy</button>
                    </div>
                  </div>
                  <form method="POST">
                    <input type="hidden" name="action" value="generate_api" />
                    <button type="submit" class="text-red-500 text-sm font-bold hover:underline transition">Revoke & Ganti API Key Baru</button>
                  </form>
                </div>
              ) : (
                <form method="POST">
                  <input type="hidden" name="action" value="generate_api" />
                  <button type="submit" class="w-full bg-brand text-white font-bold p-3 rounded-xl hover:opacity-90 transition">Aktifkan Akses API Reseller</button>
                </form>
              )}
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 class="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                <i data-lucide="webhook" class="w-5 h-5 mr-2 text-brand"></i> Webhook Forwarder
              </h2>
              <p class="text-xs text-gray-500 mb-4">Kami akan mengirim notifikasi ke endpoint Anda jika pesanan selesai. Payload dienkripsi dengan HMAC SHA-256 pada header <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-pink-500">X-SMM-Signature</code>.</p>
              <form method="POST" class="space-y-3">
                <input type="hidden" name="action" value="save_webhook" />
                <input type="url" name="webhook_url" placeholder="https://domain-anda.com/webhook" value={user?.webhook_url || ''} class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-brand transition" />
                <button type="submit" class="w-full bg-gray-800 dark:bg-gray-700 text-white font-bold p-2.5 rounded-xl hover:opacity-90 transition">Simpan URL Endpoint</button>
              </form>
            </div>
          </div>

          {/* KOLOM PROGRAM REFERRAL */}
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm h-fit">
            <h2 class="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
              <i data-lucide="users" class="w-5 h-5 mr-2 text-brand"></i> Program Afiliasi Referral
            </h2>
            
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 mb-5 border border-gray-100 dark:border-gray-700 text-center shadow-sm">
              <span class="block text-sm text-gray-500 mb-1">Total Komisi Terkumpul</span>
              <span class="text-3xl font-extrabold text-green-600">Rp {(user?.commission_balance || 0).toLocaleString('id-ID')}</span>
            </div>

            {user?.referral_code ? (
              <div>
                <label class="text-xs font-bold text-gray-500 uppercase">Tautan Undangan Anda</label>
                <div class="flex mt-1 mb-4">
                  <input type="text" readonly value={referralLink} class="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-l-lg p-2.5 font-mono text-sm outline-none" />
                  <button onclick={`navigator.clipboard.writeText('${referralLink}')`} class="bg-indigo-600 text-white px-4 rounded-r-lg hover:bg-indigo-700 font-bold text-sm transition">Copy</button>
                </div>
                <p class="text-xs text-gray-500">Bagikan tautan ini. Dapatkan saldo pasif setiap kali downline Anda mendaftar atau bertransaksi di sistem kami.</p>
              </div>
            ) : (
              <form method="POST">
                <input type="hidden" name="action" value="generate_referral" />
                <button type="submit" class="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 transition shadow-sm">Gabung Program Afiliasi</button>
              </form>
            )}
          </div>
        </div>

        {/* =========================================
            DOKUMENTASI API RESELLER
        ========================================= */}
        <div class="mt-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div class="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-bold flex items-center text-gray-900 dark:text-white">
              <i data-lucide="book-open" class="w-6 h-6 mr-2 text-brand"></i> Dokumentasi API (SMM Standard)
            </h2>
            <p class="text-sm text-gray-500 mt-2">API kami menggunakan standar SMM Panel global. Anda dapat menghubungkan skrip pihak ketiga mana pun dengan menggunakan parameter di bawah ini.</p>
          </div>

          <div class="p-6 md:p-8 space-y-8">
            
            {/* INFORMASI DASAR */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-750">
                <span class="block text-xs font-bold text-gray-500 uppercase mb-1">API Endpoint URL</span>
                <code class="text-sm font-bold text-brand">{baseUrl}/api/v1/</code>
              </div>
              <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-750">
                <span class="block text-xs font-bold text-gray-500 uppercase mb-1">HTTP Method & Format</span>
                <code class="text-sm font-bold text-gray-800 dark:text-gray-200">POST - application/json</code>
              </div>
            </div>

            <hr class="border-gray-200 dark:border-gray-700" />

            {/* 1. CEK SALDO */}
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Cek Saldo Akun</h3>
              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 font-bold text-gray-700 dark:text-gray-300">
                    <tr><th class="px-4 py-2 border-b">Parameter</th><th class="px-4 py-2 border-b">Tipe</th><th class="px-4 py-2 border-b">Deskripsi</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">key</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">API Key Anda (bisa diletakkan di header <code class="text-xs">x-api-key</code>)</td></tr>
                    <tr><td class="px-4 py-2 font-mono">action</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2"><code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-brand">balance</code></td></tr>
                  </tbody>
                </table>
              </div>
              <pre class="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner">
{`// Contoh Respons Sukses
{
  "balance": 150000.50,
  "currency": "IDR"
}`}
              </pre>
            </div>

            <hr class="border-gray-200 dark:border-gray-700" />

            {/* 2. DAFTAR LAYANAN */}
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">2. Ambil Daftar Layanan</h3>
              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 font-bold text-gray-700 dark:text-gray-300">
                    <tr><th class="px-4 py-2 border-b">Parameter</th><th class="px-4 py-2 border-b">Tipe</th><th class="px-4 py-2 border-b">Deskripsi</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">key</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">API Key Anda</td></tr>
                    <tr><td class="px-4 py-2 font-mono">action</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2"><code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-brand">services</code></td></tr>
                  </tbody>
                </table>
              </div>
              <pre class="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner">
{`// Contoh Respons Sukses
[
  {
    "service": "md_123",
    "name": "Instagram Followers - Fast",
    "type": "Default",
    "category": "Instagram Followers",
    "rate": 15000,
    "min": 100,
    "max": 10000,
    "refill": true,
    "cancel": false,
    "dripfeed": false
  }
]`}
              </pre>
            </div>

            <hr class="border-gray-200 dark:border-gray-700" />

            {/* 3. BUAT PESANAN */}
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">3. Buat Pesanan Baru</h3>
              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 font-bold text-gray-700 dark:text-gray-300">
                    <tr><th class="px-4 py-2 border-b">Parameter</th><th class="px-4 py-2 border-b">Tipe</th><th class="px-4 py-2 border-b">Deskripsi</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">key</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">API Key Anda</td></tr>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">action</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2"><code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-brand">add</code></td></tr>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">service</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">Service ID yang didapat dari endpoint services</td></tr>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">link</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">URL Target atau Username</td></tr>
                    <tr><td class="px-4 py-2 font-mono">quantity</td><td class="px-4 py-2 text-gray-500">Int</td><td class="px-4 py-2">Jumlah pesanan</td></tr>
                  </tbody>
                </table>
              </div>
              <pre class="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner">
{`// Contoh Respons Sukses
{
  "order": "1a2b3c4d-5e6f-7g8h"
}

// Contoh Respons Gagal
{
  "error": "Saldo tidak mencukupi untuk melakukan pesanan ini."
}`}
              </pre>
            </div>

            <hr class="border-gray-200 dark:border-gray-700" />

            {/* 4. CEK STATUS PESANAN */}
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Cek Status Pesanan</h3>
              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 dark:bg-gray-900 font-bold text-gray-700 dark:text-gray-300">
                    <tr><th class="px-4 py-2 border-b">Parameter</th><th class="px-4 py-2 border-b">Tipe</th><th class="px-4 py-2 border-b">Deskripsi</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">key</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">API Key Anda</td></tr>
                    <tr class="border-b dark:border-gray-700"><td class="px-4 py-2 font-mono">action</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2"><code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-brand">status</code></td></tr>
                    <tr><td class="px-4 py-2 font-mono">order</td><td class="px-4 py-2 text-gray-500">String</td><td class="px-4 py-2">ID Pesanan Anda</td></tr>
                  </tbody>
                </table>
              </div>
              <pre class="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner">
{`// Contoh Respons Sukses
{
  "charge": "15000",
  "start_count": "0",
  "status": "processing", // pending, processing, success, error, canceled
  "remains": "0",
  "currency": "IDR"
}`}
              </pre>
            </div>

          </div>
        </div>

      </div>
    </MemberLayout>,
    { title: 'Developer & API' }
  )
}

export const GET = createRoute(routeHandler)
export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
