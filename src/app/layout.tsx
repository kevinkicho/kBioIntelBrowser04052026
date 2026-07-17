import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AIProvider } from '@/lib/ai/useAI'
import { AppHeader } from '@/components/layout/AppHeader'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BioIntel Explorer',
  description: 'Explore the commercial and scientific landscape of biological molecules, drugs, and enzymes.',
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1117',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-[#0f1117] text-slate-200 min-h-screen`}>
        <AIProvider>
          <AppHeader />
          {children}
        </AIProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (!('serviceWorker' in navigator)) return;
                var h = window.location.hostname;
                var isLocal =
                  h === 'localhost' ||
                  h === '127.0.0.1' ||
                  h === '[::1]' ||
                  h.endsWith('.local');
                if (isLocal) {
                  // Dev: always unregister SW + clear Cache Storage to avoid stale
                  // /_next/static chunks (SyntaxError: Invalid or unexpected token).
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    regs.forEach(function (reg) { reg.unregister(); });
                  });
                  if (window.caches && caches.keys) {
                    caches.keys().then(function (keys) {
                      keys.forEach(function (k) { caches.delete(k); });
                    });
                  }
                  return;
                }
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}


