import { memo } from 'react'

interface PanelSkeletonProps {
  lines?: number
}

export const PanelSkeleton = memo(function PanelSkeleton({
  lines = 4
}: PanelSkeletonProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-4 w-32 bg-slate-700 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-700 rounded" style={{ width: `${100 - (i * 10)}%` }} />
        ))}
      </div>
      <div className="pt-2 border-t border-slate-700/40">
        <div className="h-3 w-32 bg-slate-700/50 rounded" />
      </div>
    </div>
  )
})

export const PanelSkeletonGrid = memo(function PanelSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PanelSkeleton key={i} />
      ))}
    </div>
  )
})