import { createRoute } from 'honox/factory'
import MemberLayout from '../components/MemberLayout'

const routeHandler = async (c: any) => {
  const sessionUser = c.get('user')
  let message = null
  let isSuccess = false

  if (c.req.method === 'POST') {
    const body = await c.req.parseBody()
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

        <form method="POST" class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h2 class="font-bold text-lg mb-4 border-b pb-2">Informasi Identitas</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1">Nama Lengkap</label>
              <input type="text" name="name" value={user?.name || ''} required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Nomor WhatsApp</label>
              <input type="text" name="whatsapp" value={user?.whatsapp || ''} required class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Alamat Email (Permanen)</label>
              <input type="email" readonly value={user?.email} class="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 cursor-not-allowed" />
            </div>
            <button type="submit" class="bg-brand text-white font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition mt-2">
              Simpan Perubahan
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
