// app/routes/register.tsx
import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  return c.render(
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div class="text-center mb-8">
          <i data-lucide="user-plus" class="text-brand w-12 h-12 mx-auto mb-3"></i>
          <h1 class="text-2xl font-bold tracking-tight">Daftar Akun Baru</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Bergabung untuk mulai menggunakan layanan SMM</p>
        </div>

        <form id="registerForm" class="space-y-5">
          <div id="alertBox" class="hidden p-3 rounded text-sm font-medium text-center"></div>
          
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
              <input type="password" id="passwordInput" required minlength="6" class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand" placeholder="Minimal 6 karakter" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Konfirmasi Kata Sandi</label>
            <div class="relative">
              <i data-lucide="check-circle" class="absolute left-3 top-3 w-5 h-5 text-gray-400"></i>
              <input type="password" id="confirmPasswordInput" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand" placeholder="Ketik ulang kata sandi" />
            </div>
          </div>

          <button type="submit" id="submitBtn" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition flex items-center justify-center space-x-2">
            <i data-lucide="user-plus" class="w-5 h-5"></i>
            <span>Buat Akun Sekarang</span>
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Sudah punya akun? <a href="/login" class="text-brand font-semibold hover:underline">Masuk di sini</a>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('emailInput').value;
          const password = document.getElementById('passwordInput').value;
          const confirmPassword = document.getElementById('confirmPasswordInput').value;
          const btn = document.getElementById('submitBtn');
          const alertBox = document.getElementById('alertBox');

          // Reset alert
          alertBox.classList.add('hidden');
          alertBox.classList.remove('bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

          if (password !== confirmPassword) {
            alertBox.textContent = 'Konfirmasi kata sandi tidak cocok!';
            alertBox.classList.add('bg-red-100', 'text-red-700');
            alertBox.classList.remove('hidden');
            return;
          }

          btn.disabled = true;
          btn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i><span>Memproses...</span>';
          lucide.createIcons();

          try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (data.success) {
              alertBox.textContent = 'Registrasi berhasil! Mengalihkan ke halaman login...';
              alertBox.classList.add('bg-green-100', 'text-green-700');
              alertBox.classList.remove('hidden');
              setTimeout(() => { window.location.href = '/login'; }, 2000);
            } else {
              alertBox.textContent = data.error || 'Gagal mendaftar. Silakan coba lagi.';
              alertBox.classList.add('bg-red-100', 'text-red-700');
              alertBox.classList.remove('hidden');
            }
          } catch (err) {
            alertBox.textContent = 'Gangguan koneksi ke server. Coba lagi.';
            alertBox.classList.add('bg-red-100', 'text-red-700');
            alertBox.classList.remove('hidden');
          } finally {
            if (!alertBox.classList.contains('bg-green-100')) {
              btn.disabled = false;
              btn.innerHTML = '<i data-lucide="user-plus" class="w-5 h-5"></i><span>Buat Akun Sekarang</span>';
              lucide.createIcons();
            }
          }
        });
      `}} />
    </div>,
    { title: 'Daftar Akun' }
  )
})
