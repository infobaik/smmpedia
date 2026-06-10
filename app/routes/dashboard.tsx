// app/routes/dashboard.tsx
import { createRoute } from 'honox/factory'
import Navbar from '../components/Navbar'

export default createRoute(async (c) => {
  // Ambil layanan dari D1 untuk ditampilkan di form
  const servicesData = await c.env.DB.prepare('SELECT id, name, rate, margin, min_order, max_order FROM services WHERE status = "active"').all()
  const services = servicesData.results || []

  return c.render(
    <div>
      <Navbar />
      <div class="max-w-4xl mx-auto px-4 py-8">
        <main class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center space-x-3 mb-6 border-b pb-4 dark:border-gray-700">
            <i data-lucide="shopping-bag" class="text-brand w-6 h-6"></i>
            <h1 class="text-xl font-bold">Buat Pesanan Baru</h1>
          </div>

          <form id="orderForm" class="space-y-5">
            <div id="orderAlert" class="hidden p-4 rounded-lg font-medium text-sm"></div>

            <div>
              <label class="block text-sm font-semibold mb-2">Pilih Layanan</label>
              <select id="serviceSelect" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none">
                <option value="" disabled selected>-- Pilih Layanan --</option>
                {services.map((srv: any) => (
                  <option value={srv.id} data-rate={srv.rate + (srv.margin || 0)} data-min={srv.min_order} data-max={srv.max_order}>
                    {srv.name} (Min: {srv.min_order} - Max: {srv.max_order})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Target URL / Username</label>
              <input type="text" id="targetLink" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" placeholder="https://instagram.com/..." />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-2">Jumlah Pesanan</label>
                <input type="number" id="orderQuantity" required class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" placeholder="Masukkan jumlah" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-2">Total Biaya</label>
                <input type="text" id="totalCost" readonly class="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 font-bold cursor-not-allowed" value="Rp 0" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Gambar/Video Referensi (Opsional)</label>
              <div class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
                <input type="file" id="mediaUpload" accept="image/*,video/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div id="uploadStatus" class="space-y-2">
                  <i data-lucide="upload-cloud" class="w-8 h-8 mx-auto text-gray-400"></i>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Pilih berkas media dari perangkat Anda</p>
                  <p class="text-xs text-gray-400">Berkas diproses menggunakan Direct Signed Upload (Stabil 100%)</p>
                </div>
              </div>
              <input type="hidden" id="uploadedMediaUrl" />
            </div>

            <button type="submit" id="submitOrderBtn" class="w-full bg-brand text-white font-semibold p-3 rounded-lg hover:opacity-90 transition">
              Kirim Pesanan (Aman dengan Idempotency)
            </button>
          </form>
        </main>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        // Cek Login
        const token = localStorage.getItem('user_token');
        const userId = localStorage.getItem('user_id');
        if (!token || !userId) window.location.href = '/login';

        // Kalkulator Harga Dinamis
        const serviceSelect = document.getElementById('serviceSelect');
        const quantityInput = document.getElementById('orderQuantity');
        const totalCostInput = document.getElementById('totalCost');

        function calculateCost() {
          const option = serviceSelect.options[serviceSelect.selectedIndex];
          if (option.value === "") return;
          const ratePer1000 = parseFloat(option.getAttribute('data-rate'));
          const qty = parseInt(quantityInput.value) || 0;
          const total = (ratePer1000 * (qty / 1000)).toFixed(2);
          totalCostInput.value = 'Rp ' + parseFloat(total).toLocaleString('id-ID');
        }

        serviceSelect.addEventListener('change', calculateCost);
        quantityInput.addEventListener('input', calculateCost);

        // Skrip Upload Media Tahan Banting (Berdasarkan Instruksi Peninjauan Ulang)
        const fileInput = document.getElementById('mediaUpload');
        const statusContainer = document.getElementById('uploadStatus');
        const hiddenUrlInput = document.getElementById('uploadedMediaUrl');

        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          statusContainer.innerHTML = '<i data-lucide="loader" class="w-8 h-8 mx-auto text-brand animate-spin"></i><p class="text-sm font-medium text-brand">Meminta Otorisasi Cloudinary...</p>';
          lucide.createIcons();

          try {
            const signResponse = await fetch('/api/cloudinary/sign', { method: 'POST' });
            const signData = await signResponse.json();

            if (!signData.signature) throw new Error('Gagal mendapatkan signature');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', signData.apiKey);
            formData.append('timestamp', signData.timestamp);
            formData.append('signature', signData.signature);
            formData.append('folder', signData.folder);

            statusContainer.innerHTML = '<i data-lucide="loader" class="w-8 h-8 mx-auto text-brand animate-spin"></i><p class="text-sm font-medium text-brand">Mengunggah Langsung ke CDN...</p>';
            lucide.createIcons();

            const uploadResponse = await fetch(\`https://api.cloudinary.com/v1_1/\${signData.cloudName}/upload\`, {
              method: 'POST',
              body: formData
            });

            const uploadData = await uploadResponse.json();
            if(!uploadResponse.ok) throw new Error(uploadData.error?.message || 'Unggah gagal');
            
            hiddenUrlInput.value = uploadData.secure_url;
            statusContainer.innerHTML = '<i data-lucide="check-circle" class="w-8 h-8 mx-auto text-green-500"></i><p class="text-sm text-green-500 font-medium">Berkas Referensi Sukses Terunggah!</p>';
            lucide.createIcons();
          } catch (error) {
            statusContainer.innerHTML = '<i data-lucide="alert-triangle" class="w-8 h-8 mx-auto text-red-500"></i><p class="text-sm text-red-500 font-medium">Gagal mengunggah berkas. Periksa koneksi.</p>';
            lucide.createIcons();
            hiddenUrlInput.value = '';
          }
        });

        // Pengiriman Form Pesanan
        document.getElementById('orderForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitOrderBtn');
          const alertBox = document.getElementById('orderAlert');
          
          btn.disabled = true;
          btn.innerHTML = 'Memproses...';
          alertBox.classList.add('hidden');
          alertBox.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');

          // Menghasilkan Kunci Idempotensi Unik per klik
          const idempotencyKey = crypto.randomUUID();

          const payload = {
            userId: userId,
            localServiceId: serviceSelect.value,
            link: document.getElementById('targetLink').value,
            quantity: parseInt(quantityInput.value),
            mediaUrl: hiddenUrlInput.value,
            idempotencyKey: idempotencyKey
          };

          try {
            const response = await fetch('/api/orders/create', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
              alertBox.textContent = result.message;
              alertBox.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-900/30', 'dark:text-green-400');
              document.getElementById('orderForm').reset();
              hiddenUrlInput.value = '';
              statusContainer.innerHTML = '<i data-lucide="upload-cloud" class="w-8 h-8 mx-auto text-gray-400"></i><p class="text-sm text-gray-500">Pilih berkas media dari perangkat Anda</p>';
              lucide.createIcons();
            } else {
              alertBox.textContent = result.error;
              alertBox.classList.add('bg-red-100', 'text-red-700', 'dark:bg-red-900/30', 'dark:text-red-400');
            }
          } catch (err) {
            alertBox.textContent = 'Gagal terhubung ke server. Coba lagi.';
            alertBox.classList.add('bg-red-100', 'text-red-700');
          } finally {
            alertBox.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = 'Kirim Pesanan (Aman dengan Idempotency)';
          }
        });
      `}} />
    </div>,
    { title: 'Dashboard Pesanan' }
  )
})
