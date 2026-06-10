// app/components/NavbarFrontend.tsx
import type { FC } from 'hono/jsx'

const NavbarFrontend: FC = () => {
  return (
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-250">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          
          {/* Sisi Kiri: Identitas Brand */}
          <div class="flex items-center">
            <i data-lucide="hexagon" class="text-blue-600 dark:text-blue-500 w-8 h-8"></i>
            <a href="/" class="ml-2 font-bold text-xl tracking-tight text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              SMMPedia
            </a>
          </div>

          {/* Sisi Kanan: Menu Kontrol Publik */}
          <div class="flex items-center space-x-4">
            
            {/* Tombol Toggle Tema (Dark/Light) */}
            <button 
              onclick="document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');" 
              class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-colors cursor-pointer" 
              aria-label="Toggle Dark Mode"
            >
              <i data-lucide="moon" class="w-5 h-5 block dark:hidden"></i>
              <i data-lucide="sun" class="w-5 h-5 hidden dark:block"></i>
            </button>
            
            {/* Navigasi Autentikasi Publik */}
            <a href="/login" class="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Masuk
            </a>
            
            <a href="/register" class="flex items-center px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm shadow-blue-500/10">
              Daftar
            </a>

          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavbarFrontend
