import type { FC } from 'hono/jsx'

const AdminLayout: FC<{ title?: string; children?: any }> = ({ title, children }) => {
  return (
    <div class="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
      
      {/* Header Admin */}
      <nav class="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="bg-red-500 p-1.5 rounded-lg">
              <i data-lucide="shield-alert" class="w-6 h-6 text-white"></i>
            </div>
            <span class="font-bold text-lg tracking-tight hidden sm:block">Admin Control</span>
            <span class="font-bold text-lg tracking-tight sm:hidden">Admin</span>
          </div>
          
          {/* Menu Desktop */}
          <div class="hidden md:flex space-x-6 items-center">
            <a href="/admin" class="text-slate-300 hover:text-white transition font-medium text-sm">Summary</a>
            <a href="/admin/orders" class="text-slate-300 hover:text-white transition font-medium text-sm">Transaksi</a>
            <a href="/admin/users" class="text-slate-300 hover:text-white transition font-medium text-sm">Pengguna</a>
            <a href="/admin/categories" class="text-slate-300 hover:text-white transition font-medium text-sm">Kategori</a>
            <a href="/admin/services" class="text-slate-300 hover:text-white transition font-medium text-sm">Produk</a>
            <a href="/admin/providers" class="text-slate-300 hover:text-white transition font-medium text-sm">Provider API</a>
            <a href="/admin/settings" class="text-slate-300 hover:text-white transition font-medium text-sm">Pengaturan</a>
          </div>

          <div class="flex items-center space-x-3">
            <a href="/dashboard" class="hidden sm:flex items-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-full transition text-slate-300 border border-slate-700">
              <i data-lucide="external-link" class="w-3.5 h-3.5 mr-1.5"></i> Mode Member
            </a>
            
            {/* Tombol Hamburger Mobile */}
            <button id="adminMobileMenuBtn" class="md:hidden p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none focus:bg-slate-800 transition">
              <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown (Tersembunyi secara default) */}
        <div id="adminMobileMenu" class="hidden md:hidden bg-slate-800 border-t border-slate-700 pb-3">
          <div class="px-2 pt-2 space-y-1">
            <a href="/admin" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Dashboard Summary</a>
            <a href="/admin/orders" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Manajemen Transaksi</a>
            <a href="/admin/users" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Manajemen Pengguna</a>
            <a href="/admin/categories" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Master Kategori</a>
            <a href="/admin/services" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Katalog Produk</a>
            <a href="/admin/providers" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Custom Provider API</a>
            <a href="/admin/settings" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Konfigurasi Web</a>
            <a href="/admin/profile" class="block px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700">Ganti Password Admin</a>
            <a href="/dashboard" class="block mt-4 px-3 py-2.5 rounded-md text-base font-bold text-brand bg-slate-900 border border-slate-700 text-center">Masuk ke Mode Member</a>
          </div>
        </div>
      </nav>

      {/* Konten Utama Admin */}
      <main class="flex-grow w-full">
        {children}
      </main>

      {/* Script untuk Toggle Mobile Menu */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('adminMobileMenuBtn')?.addEventListener('click', () => {
          const menu = document.getElementById('adminMobileMenu');
          menu.classList.toggle('hidden');
        });
      `}} />
    </div>
  )
}

export default AdminLayout
