'use client'

import { useRef, useMemo, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
  emptyMessage?: string
}

function VirtualizedListComponent<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
  className = '',
  emptyMessage = 'No items found.'
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  if (items.length === 0) {
    return (
      <div className={`text-slate-500 text-sm py-4 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: '400px', maxHeight: '50vh' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent

/**
 * PaginatedVirtualizedList - Shows first N items, then "Show all" enables virtualization
 * This provides a good balance: quick initial render, but virtualization for large datasets
 */
interface PaginatedVirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  initialCount?: number
  estimateSize?: number
  className?: string
  emptyMessage?: string
}

export function PaginatedVirtualizedList<T>({
  items,
  renderItem,
  initialCount = 10,
  estimateSize = 80,
  className = '',
  emptyMessage = 'No items found.'
}: PaginatedVirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Show initial items without virtualization for fast initial render
  const initialItems = useMemo(() => items.slice(0, initialCount), [items, initialCount])
  const remainingItems = useMemo(() => items.slice(initialCount), [items, initialCount])
  const showAll = items.length > initialCount

  const rowVirtualizer = useVirtualizer({
    count: remainingItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  })

  if (items.length === 0) {
    return (
      <div className={`text-slate-500 text-sm py-4 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Render initial items directly for fast initial render */}
      {initialItems.map((item, index) => renderItem(item, index))}

      {/* Virtualized section for remaining items */}
      {remainingItems.length > 0 && (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: '350px', maxHeight: '40vh' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderItem(remainingItems[virtualItem.index], initialCount + virtualItem.index)}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAll && (
        <div className="text-xs text-slate-500 mt-2 px-1">
          Showing {initialCount} of {items.length} items. Scroll to see more.
        </div>
      )}
    </div>
  )
}