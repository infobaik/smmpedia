import type { FC } from 'hono/jsx'
import Navbar from './Navbar'

const MemberLayout: FC<{ title?: string; balance?: number; children?: any }> = ({ title, balance = 0, children }) => {
  return (
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar balance={balance} />
      
      <div class="flex-grow flex w-full max-w-7xl mx-auto relative">
        <aside class="hidden md:block w-64 flex-shrink-0 px-4 py-8 border-r border-gray-200 dark:border-gray-800">
          <nav class="space-y-2 sticky top-24">
            <a href="/dashboard" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><i data-lucide="layout-dashboard" class="w-5 h-5"></i><span class="font-medium">Dasbor</span></a>
            <a href="/order" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><i data-lucide="shopping-cart" class="w-5 h-5"></i><span class="font-medium">Pesanan Baru</span></a>
            <a href="/history" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><i data-lucide="history" class="w-5 h-5"></i><span class="font-medium">Riwayat Transaksi</span></a>
            <a href="/wallet" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><i data-lucide="wallet" class="w-5 h-5"></i><span class="font-medium">Saldo & Deposit</span></a>
            <a href="/profile" class="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-brand px-4 py-3 rounded-xl transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><i data-lucide="user-cog" class="w-5 h-5"></i><span class="font-medium">Profil & Keamanan</span></a>
          </nav>
        </aside>

        <main class="flex-1 w-full min-w-0 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center h-16 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <a href="/dashboard" class="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand transition"><i data-lucide="layout-dashboard" class="w-5 h-5"></i><span class="text-[10px] mt-1 font-semibold">Dasbor</span></a>
        <a href="/order" class="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand transition"><i data-lucide="shopping-cart" class="w-5 h-5"></i><span class="text-[10px] mt-1 font-semibold">Pesan</span></a>
        <a href="/history" class="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand transition"><i data-lucide="history" class="w-5 h-5"></i><span class="text-[10px] mt-1 font-semibold">Riwayat</span></a>
        <a href="/wallet" class="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand transition"><i data-lucide="wallet" class="w-5 h-5"></i><span class="text-[10px] mt-1 font-semibold">Dompet</span></a>
        <a href="/profile" class="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand transition"><i data-lucide="user-cog" class="w-5 h-5"></i><span class="text-[10px] mt-1 font-semibold">Profil</span></a>
      </nav>
    </div>
  )
}

export default MemberLayout
