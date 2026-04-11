import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
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
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {})
                })
              } else if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
                // Periodically unregister in dev to avoid 404 cache loops
                navigator.serviceWorker.getRegistrations().then(regs => {
                  for (let reg of regs) reg.unregister();
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}


