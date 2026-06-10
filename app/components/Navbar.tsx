// app/components/Navbar.tsx
import type { FC } from 'hono/jsx'

interface NavbarProps {
  balance?: number
  showBalance?: boolean
}

// Menerima parameter balance dan flag showBalance untuk kontrol tampilan publik
const Navbar: FC<NavbarProps> = ({ balance = 0, showBalance = true }) => {
  return (
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <i data-lucide="hexagon" class="text-blue-600 dark:text-blue-500 w-8 h-8"></i>
            <a href="/dashboard" class="ml-2 font-bold text-xl tracking-tight text-gray-900 dark:text-white hover:text-blue-600 transition-colors">
              SMMPedia
            </a>
          </div>
          <div class="flex items-center space-x-4">
            
            {/* SALDO HANYA MUNCUL JIKA showBalance BERNILAI TRUE */}
            {showBalance && (
              <div class="hidden sm:block text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 px-4 rounded-full">
                Saldo: <span class="font-bold text-brand">Rp {balance.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            <button onclick="document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-colors cursor-pointer" aria-label="Toggle Dark Mode">
              <i data-lucide="moon" class="w-5 h-5 block dark:hidden"></i>
              <i data-lucide="sun" class="w-5 h-5 hidden dark:block"></i>
            </button>
            
            <button onclick="localStorage.removeItem('user_token'); localStorage.removeItem('user_id'); document.cookie = 'user_token=; Max-Age=0; path=/'; window.location.href = '/login';" class="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none transition-colors cursor-pointer" title="Keluar">
              <i data-lucide="log-out" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
