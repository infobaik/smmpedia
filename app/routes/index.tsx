// app/routes/index.tsx
import { createRoute } from 'honox/factory'
import Navbar from '../components/Navbar'

const routeHandler = async (c: any) => {
  const userSession = c.get('user')
  let balance = 0
  let isLoggedIn = false

  // JIKA USER LOGIN: Ambil saldo untuk ditampilkan di Header/Navbar
  if (userSession && userSession.userId) {
    isLoggedIn = true
    const user = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(userSession.userId).first()
    if (user) balance = user.balance
  }

  let config = { siteName: 'SMMPedia', primaryColor: '#2563eb' }
  try {
    const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS')
    if (kvConfigRaw) config = JSON.parse(kvConfigRaw)
  } catch (e) {}

  return c.render(
    <div class="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Mengirim status login dan saldo ke Navbar */}
      <Navbar isLoggedIn={isLoggedIn} balance={balance} siteName={config.siteName} />
      
      <main class="flex-grow flex items-center justify-center">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div class="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-8">
            <i data-lucide="rocket" class="w-10 h-10 text-brand"></i>
          </div>
          
          <h1 class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-6">
            Otomatisasi Sosmed dengan <span class="text-brand block mt-2">{config.siteName}</span>
          </h1>
          
          <p class="mt-4 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 mb-10">
            Platform layanan sosial media terbaik. Dilengkapi dengan API tingkat enterprise untuk Reseller dan sistem Referral menguntungkan.
          </p>
          
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            {isLoggedIn ? (
              <a href="/dashboard" class="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-brand hover:opacity-90 transition shadow-lg shadow-blue-500/30">
                <i data-lucide="layout-dashboard" class="w-5 h-5 mr-2"></i> Masuk Dasbor Saya
              </a>
            ) : (
              <>
                <a href="/register" class="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-brand hover:opacity-90 transition shadow-lg shadow-blue-500/30">
                  Daftar Sekarang
                </a>
                <a href="/login" class="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-gray-300 dark:border-gray-700 text-base font-bold rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-sm">
                  Login
                </a>
              </>
            )}
          </div>
        </div>
      </main>
    </div>,
    { title: 'Beranda SMMPedia' }
  )
}

export const GET = createRoute(routeHandler)
export default createRoute(routeHandler)
