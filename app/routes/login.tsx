// app/routes/login.tsx
import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  return c.render(
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div class="text-center mb-8">
          <i data-lucide="shield-check" class="text-brand w-12 h-12 mx-auto mb-3"></i>
          <h1 class="text-2xl font-bold tracking-tight">Masuk ke Dasbor</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Akses panel kontrol SMM Anda</p>
        </div>

        <form id="loginForm" class="space-y-5">
          <div id="alertBox" class="hidden p-3 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-medium text-center"></div>
          
          <div>
            <label class="block text-sm font-semibold mb-2">Alamat Email</label>
            <div class="relative">
              <i data-lucide="mail" class="absolute left-3 top-3 w-5 h-5 text-gray-400"></i>
              <input type="email" id="emailInput" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand" placeholder="nama@email.com" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Kata Sandi</label>
            <div class="relative">
              <i data-lucide="lock" class="absolute left-3 top-3 w-5 h-5 text-gray-400"></i>
              <input type="password" id="passwordInput" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" id="submitBtn" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition flex items-center justify-center space-x-2">
            <i data-lucide="log-in" class="w-5 h-5"></i>
            <span>Autentikasi</span>
          </button>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('emailInput').value;
          const password = document.getElementById('passwordInput').value;
          const btn = document.getElementById('submitBtn');
          const alertBox = document.getElementById('alertBox');

          btn.disabled = true;
          btn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i><span>Memproses...</span>';
          lucide.createIcons();
          alertBox.classList.add('hidden');

          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (data.success) {
              // Simpan token di localStorage (untuk API) dan Cookie (untuk SSR Middleware)
              localStorage.setItem('user_token', data.token);
              localStorage.setItem('user_id', data.user.id);
              document.cookie = 'user_token=' + data.token + '; path=/; max-age=604800; SameSite=Lax';
              
              window.location.href = '/dashboard';
            } else {
              alertBox.textContent = data.error || 'Gagal masuk. Periksa kredensial Anda.';
              alertBox.classList.remove('hidden');
            }
          } catch (err) {
            alertBox.textContent = 'Gangguan koneksi ke server. Coba lagi.';
            alertBox.classList.remove('hidden');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="log-in" class="w-5 h-5"></i><span>Autentikasi</span>';
            lucide.createIcons();
          }
        });
      `}} />
    </div>,
    { title: 'Login' }
  )
})
