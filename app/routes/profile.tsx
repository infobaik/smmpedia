import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const sessionUser = c.get('user')
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
    const action = body._action || 'update_profile'

    // ==========================================
    // AKSI 1: UPDATE PROFIL (NAMA & WA)
    // ==========================================
    if (action === 'update_profile') {
      const name = String(body.name).trim()
      const whatsapp = String(body.whatsapp).trim()

      try {
        await c.env.DB.prepare('UPDATE users SET name = ?1, whatsapp = ?2 WHERE id = ?3')
          .bind(name, whatsapp, sessionUser.userId).run()
        message = 'Profil berhasil diperbarui!'
        isSuccess = true
      } catch (e) {
        message = 'Gagal memperbarui profil.'
      }
    } 
    // ==========================================
    // AKSI 2: GANTI KATA SANDI
    // ==========================================
    else if (action === 'change_password') {
      const oldPassword = String(body.old_password)
      const newPassword = String(body.new_password)
      const confirmPassword = String(body.confirm_password)

      if (newPassword !== confirmPassword) {
        message = "Konfirmasi kata sandi baru tidak cocok!"
      } else if (newPassword.length < 6) {
        message = "Kata sandi baru minimal 6 karakter."
      } else {
        // 1. Hash password lama yang diinputkan untuk dicocokkan ke DB (Menggunakan SHA-256 bawaan sistem Anda)
        const oldMsgBuffer = new TextEncoder().encode(oldPassword)
        const oldHashBuffer = await crypto.subtle.digest('SHA-256', oldMsgBuffer)
        const oldHashArray = Array.from(new Uint8Array(oldHashBuffer))
        const oldPasswordHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // 2. Ambil password_hash dari DB
        const userRecord = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?1')
          .bind(sessionUser.userId).first()

        // 3. Validasi Kecocokan
        if (userRecord && userRecord.password_hash === oldPasswordHash) {
          
          // Hash password baru
          const newMsgBuffer = new TextEncoder().encode(newPassword)
          const newHashBuffer = await crypto.subtle.digest('SHA-256', newMsgBuffer)
          const newHashArray = Array.from(new Uint8Array(newHashBuffer))
          const newPasswordHash = newHashArray.map(b => b.toString(16).padStart(2, '0')).join('')

          try {
            await c.env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2')
              .bind(newPasswordHash, sessionUser.userId).run()
            message = "Kata sandi berhasil diperbarui!"
            isSuccess = true
          } catch (e) {
            message = "Gagal memperbarui kata sandi karena kendala sistem."
          }
        } else {
          message = "Kata sandi saat ini (lama) salah!"
        }
      }
    }
  }

  const user = await c.env.DB.prepare('SELECT name, whatsapp, email, balance FROM users WHERE id = ?1').bind(sessionUser.userId).first()
  const balance = user?.balance || 0

  return c.render(
    <MemberLayout title="Pengaturan Profil" balance={balance}>
      <div class="p-6 md:p-8 max-w-2xl">
        <h1 class="text-2xl font-bold mb-6">Profil Pengguna</h1>
        
        {message && (
          <div class={`p-4 rounded-lg text-sm mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* 1. FORM UPDATE PROFIL */}
        <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
          <input type="hidden" name="_action" value="update_profile" />
          <h2 class="font-bold text-lg mb-4 border-b dark:border-gray-700 pb-2">Informasi Identitas</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1">Nama Lengkap</label>
              <input type="text" name="name" value={user?.name || ''} required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Nomor WhatsApp</label>
              <input type="text" name="whatsapp" value={user?.whatsapp || ''} required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Alamat Email (Permanen)</label>
              <input type="email" readonly value={user?.email} class="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 cursor-not-allowed text-gray-500" />
            </div>
            <button type="submit" class="bg-brand text-white font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition mt-2">
              Simpan Perubahan
            </button>
          </div>
        </form>

        {/* 2. FORM GANTI PASSWORD */}
        <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <input type="hidden" name="_action" value="change_password" />
          <h2 class="font-bold text-lg mb-4 border-b dark:border-gray-700 pb-2 text-red-600 dark:text-red-400">Keamanan & Sandi</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1">Kata Sandi Saat Ini</label>
              <input type="password" name="old_password" required placeholder="Masukkan kata sandi lama" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Kata Sandi Baru</label>
              <input type="password" name="new_password" required minlength="6" placeholder="Minimal 6 karakter" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Konfirmasi Kata Sandi Baru</label>
              <input type="password" name="confirm_password" required minlength="6" placeholder="Ketik ulang kata sandi baru" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <button type="submit" class="bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition mt-2">
              Perbarui Kata Sandi
            </button>
          </div>
        </form>

      </div>
    </MemberLayout>,
    { title: 'Profil' }
  )
}
export const POST = createRoute(routeHandler)
export default createRoute(routeHandler)
