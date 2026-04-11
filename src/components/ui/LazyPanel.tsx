'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'

interface LazyPanelProps {
  /** Content to render when visible */
  children: ReactNode
  /** Fallback to show while not visible (optional skeleton) */
  fallback?: ReactNode
  /** Height placeholder while loading (default: auto) */
  minHeight?: string | number
  /** Root margin for intersection observer (default: '100px') */
  rootMargin?: string
  /** Threshold for intersection (default: 0.1) */
  threshold?: number
  /** Additional CSS classes */
  className?: string
  /** Whether to render content immediately (bypass lazy loading) */
  forceRender?: boolean
}

/**
 * LazyPanel wraps content and only renders it when the panel
 * scrolls into view. This improves initial page load performance
 * by deferring off-screen content.
 *
 * Uses Intersection Observer API for efficient visibility detection.
 */
export function LazyPanel({
  children,
  fallback,
  minHeight = 'auto',
  rootMargin = '100px',
  threshold = 0.1,
  className = '',
  forceRender = false,
}: LazyPanelProps) {
  const [isVisible, setIsVisible] = useState(forceRender)
  const [hasBeenVisible, setHasBeenVisible] = useState(forceRender)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Skip if force render is enabled
    if (forceRender) {
      setIsVisible(true)
      setHasBeenVisible(true)
      return
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasBeenVisible(true)
          // Once visible, stop observing
          observer.unobserve(element)
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [forceRender, rootMargin, threshold])

  // If force render, always show content
  if (forceRender) {
    return <div className={className}>{children}</div>
  }

  // Once content has been visible, keep it rendered (don't unrender on scroll away)
  if (hasBeenVisible) {
    return <div className={className}>{children}</div>
  }

  // While not visible, show placeholder or skeleton
  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: minHeight !== 'auto' ? minHeight : undefined }}
    >
      {isVisible ? (
        children
      ) : (
        fallback || <PanelSkeleton />
      )}
    </div>
  )
}

/**
 * Default skeleton placeholder for lazy panels
 */
function PanelSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 bg-slate-700/50 rounded" />
        <div className="h-4 w-20 bg-slate-700/50 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-5/6 bg-slate-700/50 rounded" />
        <div className="h-4 w-4/6 bg-slate-700/50 rounded" />
      </div>

      {/* Items skeleton */}
      <div className="mt-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
            <div className="h-3 w-24 bg-slate-700/50 rounded" />
            <div className="h-3 flex-1 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Specialized skeleton variants for different panel types
 */
export function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded mb-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 flex-1 bg-slate-700/50 rounded" />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-slate-700/50">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="h-3 flex-1 bg-slate-700/30 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-24 bg-slate-700/50 rounded mb-4" />
      <div className="h-48 w-full bg-slate-700/30 rounded flex items-center justify-center">
        <div className="h-32 w-3/4 bg-slate-700/50 rounded" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
          <div className="h-3 w-20 bg-slate-700/50 rounded" />
          <div className="h-3 flex-1 bg-slate-700/50 rounded" />
          <div className="h-3 w-16 bg-slate-700/50 rounded" />
        </div>
      ))}
    </div>
  )
}

export default LazyPanel