// app/routes/_renderer.tsx
import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(async ({ children, title }, c) => {
  // Mengambil konfigurasi dinamis dari KV, jika kosong gunakan default
  let config = {
    siteName: 'SMM Panel Pro',
    primaryColor: '#2563eb',
    maintenanceMode: false
  }
  
  try {
    const kvConfigRaw = await c.env.CONFIG_KV.get('FRONTEND_SETTINGS')
    if (kvConfigRaw) {
      config = JSON.parse(kvConfigRaw)
    }
  } catch (e) {
    // Abaikan jika KV belum diatur
  }

  return (
    <html lang="id" class="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} - ${config.siteName}` : config.siteName}</title>
        
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: { colors: { brand: '${config.primaryColor}' } }
            }
          }
        `}} />
        
        <script src="https://unpkg.com/lucide@latest"></script>
        
        <script dangerouslySetInnerHTML={{ __html: `
          if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        `}} />
      </head>
      <body class="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200">
        {config.maintenanceMode ? (
          <div class="min-h-screen flex items-center justify-center flex-col text-center px-4">
            <i data-lucide="settings" class="w-16 h-16 text-brand animate-spin mb-4"></i>
            <h1 class="text-3xl font-bold mb-2">Sistem Sedang Dalam Pemeliharaan</h1>
            <p class="text-gray-500 dark:text-gray-400">Kami sedang melakukan peningkatan sistem. Silakan kembali lagi nanti.</p>
          </div>
        ) : (
          children
        )}
        <script dangerouslySetInnerHTML={{ __html: `lucide.createIcons();` }} />
      </body>
    </html>
  )
})
