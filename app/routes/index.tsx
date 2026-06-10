// app/routes/index.tsx
import { createRoute } from 'honox/factory'
import NavbarFrontend from '../components/NavbarFrontend'

export default createRoute(
  async (c) => {
    // 1. Ambil jumlah layanan aktif & kategori secara paralel dari Database D1
    let totalServices = 0
    let totalCategories = 0

    try {
      const [servicesCount, categoriesCount] = await Promise.all([
        c.env.DB.prepare("SELECT COUNT(*) as total FROM services WHERE status = 'active'").first(),
        c.env.DB.prepare("SELECT COUNT(*) as total FROM categories").first()
      ])

      if (servicesCount) totalServices = (servicesCount as any).total || 0
      if (categoriesCount) totalCategories = (categoriesCount as any).total || 0
    } catch (error) {
      // Fallback aman jika database kosong / belum migrasi
    }

    // 2. Ambil pengaturan dinamis dari KV jika tersedia
    let config = {
      siteName: 'SMMPedia',
      primaryColor: '#2563eb'
    }
    
    try {
      const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS')
      if (kvConfigRaw) {
        config = JSON.parse(kvConfigRaw)
      }
    } catch (e) {
      // Abaikan jika KV kosong
    }

    return c.render(
      <div class="min-h-screen flex flex-col">
        {/* Navbar khusus publik terluar */}
        <NavbarFrontend />
        
        <main class="flex-grow flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            
            {/* BADGE STATISTIK LIVE */}
            <div class="inline-flex flex-wrap items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 px-4 py-2 rounded-full mb-8 shadow-sm">
              <span class="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                <i data-lucide="layers" class="w-4 h-4 mr-1.5 text-brand"></i>
                <strong class="text-gray-900 dark:text-white mr-1">{totalCategories.toLocaleString('id-ID')}</strong> Kategori
              </span>
              <span class="text-gray-300 dark:text-gray-600">|</span>
              <span class="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                <i data-lucide="server" class="w-4 h-4 mr-1.5 text-green-500"></i>
                <strong class="text-gray-900 dark:text-white mr-1">{totalServices.toLocaleString('id-ID')}</strong> Layanan Aktif
              </span>
            </div>
            
            <h1 class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-6">
              Tingkatkan Metrik Sosial Anda dengan <span class="text-brand block mt-2">{config.siteName}</span>
            </h1>
            
            <p class="mt-4 max-w-2xl mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:text-xl mb-10">
              Platform otomatisasi pemasaran media sosial yang dirancang untuk kecepatan, keamanan, dan skalabilitas. Kelola pesanan Anda dalam satu dasbor cerdas.
            </p>
            
            <div class="flex flex-col sm:flex-row justify-center gap-4">
              <a href="/register" class="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-brand hover:opacity-90 transition shadow-sm md:py-4 md:text-lg">
                Mulai Sekarang
                <i data-lucide="arrow-right" class="ml-2 w-5 h-5"></i>
              </a>
              <a href="/login" class="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-sm md:py-4 md:text-lg">
                Masuk ke Dasbor
              </a>
            </div>

            <div class="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 text-left">
              <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <i data-lucide="zap" class="w-8 h-8 text-brand mb-4"></i>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Proses Instan</h3>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Pesanan Anda diteruskan secara otomatis ke server penyedia tanpa jeda waktu.</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <i data-lucide="shield-check" class="w-8 h-8 text-brand mb-4"></i>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Transaksi Aman</h3>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Sistem kami dilengkapi dengan penguncian Idempotency untuk mencegah duplikasi pesanan.</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <i data-lucide="code-2" class="w-8 h-8 text-brand mb-4"></i>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">API Modular</h3>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Dukungan penuh untuk integrasi kustom dan penerimaan webhook secara real-time.</p>
              </div>
            </div>
          </div>
        </main>
        
        <footer class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8 mt-auto">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div class="mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} {config.siteName}. Hak Cipta Dilindungi.
            </div>
            <div class="flex space-x-6">
              <a href="#" class="hover:text-gray-900 dark:hover:text-white transition">Ketentuan Layanan</a>
              <a href="#" class="hover:text-gray-900 dark:hover:text-white transition">Kebijakan Privasi</a>
              <a href="#" class="hover:text-gray-900 dark:hover:text-white transition">Dokumentasi API</a>
            </div>
          </div>
        </footer>
      </div>,
      { title: 'Beranda' }
    )
  }
)
