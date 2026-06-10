import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

export default createRoute(async (c) => {
  const user = c.get('user')
  const userData = await c.env.DB.prepare('SELECT balance FROM users WHERE id = ?1').bind(user.userId).first()

  return c.render(
    <MemberLayout title="Dompet & Saldo">
      <div class="p-6 md:p-8 max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Dompet Akun</h1>
        
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center mb-8">
          <p class="text-gray-500 dark:text-gray-400 mb-2">Saldo Aktif Anda</p>
          <h2 class="text-4xl font-extrabold text-brand">Rp {(userData?.balance || 0).toLocaleString('id-ID')}</h2>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-xl">
          <h3 class="font-bold text-lg text-blue-800 dark:text-blue-300 mb-2 flex items-center">
            <i data-lucide="info" class="w-5 h-5 mr-2"></i> Instruksi Deposit
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mb-4">
            Untuk saat ini, pengisian saldo dilakukan secara manual melalui transfer Bank atau E-Wallet. Silakan hubungi Admin untuk melakukan penambahan saldo.
          </p>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-lg text-sm border border-blue-100 dark:border-blue-700">
            <p><strong>BCA:</strong> 1234567890 a.n SMM Admin</p>
            <p><strong>DANA/OVO:</strong> 0812-3456-7890</p>
            <p class="mt-3 text-gray-500 text-xs">*Sertakan email akun Anda pada berita transfer.</p>
          </div>
        </div>
      </div>
    </MemberLayout>,
    { title: 'Dompet' }
  )
})
