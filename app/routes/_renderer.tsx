import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children, title }) => {
  return (
    <html lang="id" class="light">
      <head>
        <meta charset="utf-8" />
        {/* TAG INI YANG MEMBUAT TAMPILAN MOBILE BEKERJA */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>{title ? `${title} - SMM Panel Pro` : 'SMM Panel Pro'}</title>
        
        {/* Tailwind & Icons */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { brand: '#2563eb' } } }
          }
        `}}></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: 'Inter', sans-serif; }
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        `}}></style>
      </head>
      <body class="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen flex flex-col">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          lucide.createIcons();
          // Cek preferensi Dark Mode
          if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        `}}></script>
      </body>
    </html>
  )
})
