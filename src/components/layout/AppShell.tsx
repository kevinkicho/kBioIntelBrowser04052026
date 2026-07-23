'use client'

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppHeader } from './AppHeader'
import { SearchHistorySidebar } from './SearchHistorySidebar'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { UiDensityToggle } from './UiDensityToggle'

/**
 * App chrome: header + collapsible search-history sidebar + main content.
 * Sidebar width is published as --app-sidebar-width so canvas + header share offset.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isEmbed = pathname.startsWith('/embed')
  const { ui, hydrated } = useSearchHistory()

  const sidebarCollapsed = !hydrated || ui.collapsed
  // Match sidebar: collapsed w-10 (2.5rem), expanded sm:w-72 (18rem)
  const sidebarWidth = isEmbed
    ? '0px'
    : sidebarCollapsed
      ? '2.5rem'
      : '18rem'

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--app-sidebar-width', sidebarWidth)
    return () => {
      document.documentElement.style.removeProperty('--app-sidebar-width')
    }
  }, [sidebarWidth])

  if (isEmbed) {
    return (
      <div className="min-h-screen" data-testid="app-shell-main" data-sidebar="embed">
        {children}
      </div>
    )
  }

  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <SearchHistorySidebar />
      </Suspense>
      <div
        className="app-shell-main min-h-[calc(100vh-var(--app-header-height))] transition-[padding] duration-200"
        style={{ paddingLeft: 'var(--app-sidebar-width, 2.5rem)' }}
        data-testid="app-shell-main"
        data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
      >
        {children}
      </div>
      {/* Density toggle lives bottom-left of main chrome (not under sidebar rail) */}
      <div
        className="pointer-events-none fixed bottom-3 z-[55] transition-[left] duration-200"
        style={{ left: `calc(var(--app-sidebar-width, 2.5rem) + 0.75rem)` }}
      >
        <div className="pointer-events-auto">
          <UiDensityToggle />
        </div>
      </div>
    </>
  )
}
