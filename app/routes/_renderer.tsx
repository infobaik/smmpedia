// app/routes/_renderer.tsx
import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children, title }) => {
  const siteTitle = title ? `${title} - SMMPedia` : 'SMMPedia - SMM Panel Terbaik & Termurah Indonesia'
  const siteDesc = 'SMMPedia adalah platform otomatisasi pemasaran media sosial (SMM Panel) terbaik, tercepat, dan termurah di Indonesia. Menyediakan layanan optimasi instan dengan dukungan API v1 modular untuk Reseller.'
  const siteKeywords = 'smm panel, smm panel indonesia, smmpedia, panel smm murah, followers instagram, optimasi sosmed, reseller smm api, sfa panel'

  return (
    <html lang="id" class="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        
        {/* SEO Dasar */}
        <title>{siteTitle}</title>
        <meta name="description" content={siteDesc} />
        <meta name="keywords" content={siteKeywords} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="SMMPedia Development Team" />

        {/* Facebook / Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://smmpedia.pages.dev/" />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDesc} />
        <meta property="og:image" content="/banner-og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="SMMPedia" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://smmpedia.pages.dev/" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDesc} />
        <meta name="twitter:image" content="/banner-og.png" />

        {/* Favicon & Icons */}
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* Tailwind, Font & Icons */}
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
