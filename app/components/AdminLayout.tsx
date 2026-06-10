import type { FC } from 'hono/jsx'

const AdminLayout: FC<{ title?: string; children?: any }> = ({ title, children }) => {
  return (
    <div class="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
      
      {/* Header Khusus Admin */}
      <nav class="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="bg-red-500 p-1.5 rounded-lg">
              <i data-lucide="shield-alert" class="w-6 h-6 text-white"></i>
            </div>
            <span class="font-bold text-lg tracking-tight">Admin Control</span>
          </div>
          
          <div class="hidden md:flex space-x-6 items-center">
            <a href="/admin" class="text-slate-300 hover:text-white transition font-medium text-sm">Summary</a>
            <a href="/admin/orders" class="text-slate-300 hover:text-white transition font-medium text-sm">Transaksi</a>
            <a href="/admin/users" class="text-slate-300 hover:text-white transition font-medium text-sm">Pengguna</a>
            <a href="/admin/categories" class="text-slate-300 hover:text-white transition font-medium text-sm">Katalog</a>
            <a href="/admin/settings" class="text-slate-300 hover:text-white transition font-medium text-sm">Konfigurasi</a>
          </div>

          <div class="flex items-center space-x-4">
            <a href="/dashboard" class="flex items-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-full transition text-slate-300 hover:text-white border border-slate-700">
              <i data-lucide="external-link" class="w-3.5 h-3.5 mr-1.5"></i>
              Mode Member
            </a>
          </div>
        </div>
      </nav>

      {/* Konten Utama Admin */}
      <main class="flex-grow w-full">
        {children}
      </main>
      
    </div>
  )
}

export default AdminLayout
