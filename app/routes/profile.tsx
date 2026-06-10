import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

export default createRoute(async (c) => {
  const user = c.get('user')

  return c.render(
    <MemberLayout title="Pengaturan Profil">
      <div class="p-6 md:p-8 max-w-2xl">
        <h1 class="text-2xl font-bold mb-6">Pengaturan Akun</h1>
        
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <h2 class="font-bold text-lg mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Informasi Dasar</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-500">ID Pengguna</label>
              <input type="text" readonly value={user.userId} class="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm cursor-not-allowed" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-500">Alamat Email</label>
              <input type="email" readonly value={user.email} class="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm cursor-not-allowed" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-500">Peran Akun</label>
              <span class="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{user.role}</span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 class="font-bold text-lg mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center">
            <i data-lucide="lock" class="w-5 h-5 mr-2 text-brand"></i> Keamanan
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Fitur penggantian kata sandi mandiri akan segera diaktifkan pada pembaruan sistem berikutnya. Jaga kerahasiaan akun Anda.</p>
        </div>
      </div>
    </MemberLayout>,
    { title: 'Profil' }
  )
})
