'use client'

import { usePathname } from 'next/navigation'
import { AppHeader } from './AppHeader'
import { SearchHistorySidebar } from './SearchHistorySidebar'
import { useSearchHistory } from '@/hooks/useSearchHistory'

/**
 * App chrome: header + collapsible search-history sidebar + main content.
 * Sidebar offset applies on non-embed routes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isEmbed = pathname.startsWith('/embed')
  const { ui, hydrated } = useSearchHistory()

  const sidebarCollapsed = !hydrated || ui.collapsed
  // Match sidebar widths: collapsed w-10 (2.5rem), expanded w-72 / min(18rem)
  const padClass = isEmbed
    ? ''
    : sidebarCollapsed
      ? 'pl-10'
      : 'pl-0 sm:pl-72'

  return (
    <>
      <AppHeader />
      {!isEmbed && <SearchHistorySidebar />}
      <div
        className={`min-h-[calc(100vh-var(--app-header-height))] transition-[padding] duration-200 ${padClass}`}
        data-testid="app-shell-main"
      >
        {children}
      </div>
    </>
  )
}
