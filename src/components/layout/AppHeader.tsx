'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'
import { AIStatusIndicator } from '@/components/ai/AIStatusIndicator'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const NAV = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/discover', label: 'Discover', match: (p: string) => p.startsWith('/discover') },
  { href: '/projects', label: 'Projects', match: (p: string) => p.startsWith('/projects') },
  { href: '/orgs', label: 'Orgs', match: (p: string) => p.startsWith('/orgs') },
  {
    href: '/ai-history',
    label: 'AI history',
    match: (p: string) => p.startsWith('/ai-history'),
  },
  {
    href: '/how-it-works',
    label: 'How it works',
    match: (p: string) => p.startsWith('/how-it-works'),
  },
  {
    href: '/methodology',
    label: 'Data methods',
    match: (p: string) => p.startsWith('/methodology'),
  },
] as const

/**
 * Global app shell navigation (KD15).
 * Hidden on embed routes so widgets stay chrome-free.
 * Top-right: search + AI chip + local workspace menu (solo session / logout).
 */
export function AppHeader() {
  const pathname = usePathname() ?? ''

  // Embed surfaces must remain header-free
  if (pathname.startsWith('/embed')) {
    return null
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0f1117]/90 backdrop-blur-md transition-[padding] duration-200"
      style={{ paddingLeft: 'var(--app-sidebar-width, 2.5rem)' }}
      data-testid="app-header"
    >
      <div className="app-header-inner">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-tight text-slate-100 hover:text-white"
          >
            BioIntel
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                    active
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <AIStatusIndicator />
          <StyledTooltip content="Search molecules, diseases, genes">
            <Link
              href="/?focus=search"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
              aria-label="Search molecules, diseases, genes"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </Link>
          </StyledTooltip>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
