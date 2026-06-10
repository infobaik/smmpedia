import type { FC } from 'hono/jsx'
import Navbar from './Navbar'

const MemberLayout: FC<{ title?: string; children?: any }> = ({ title, children }) => {
  return (
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      
      <div class="flex-grow flex w-full max-w-7xl mx-auto">
        {/* Sidebar Navigasi Member */}
        <aside class="hidden md:block w-64 flex-shrink-0 px-4 py-8 border-r border-gray-200 dark:border-gray-800">
          <nav class="space-y-2 sticky top-24">
            <a href="/dashboard" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand dark:hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
              <span class="font-medium">Dasbor</span>
            </a>
            <a href="/order" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand dark:hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <i data-lucide="shopping-cart" class="w-5 h-5"></i>
              <span class="font-medium">Pesanan Baru</span>
            </a>
            <a href="/history" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand dark:hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <i data-lucide="history" class="w-5 h-5"></i>
              <span class="font-medium">Riwayat Transaksi</span>
            </a>
            <a href="/wallet" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand dark:hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <i data-lucide="wallet" class="w-5 h-5"></i>
              <span class="font-medium">Saldo & Deposit</span>
            </a>
            <a href="/profile" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand dark:hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <i data-lucide="user-cog" class="w-5 h-5"></i>
              <span class="font-medium">Pengaturan Profil</span>
            </a>
          </nav>
        </aside>

        {/* Konten Utama */}
        <main class="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MemberLayout
