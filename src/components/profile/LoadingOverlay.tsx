'use client'

import { useEffect, useState } from 'react'
import { CATEGORIES, type CategoryId, type CategoryDataCount } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

interface LoadingOverlayProps {
  categoryStatus: Record<CategoryId, CategoryLoadState>
  dataCounts: Record<CategoryId, CategoryDataCount>
}

function StatusIcon({ status }: { status: CategoryLoadState }) {
  switch (status) {
    case 'loaded':
      return <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    case 'loading':
      return <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    case 'error':
      return <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
  }
}

export function LoadingOverlay({ categoryStatus, dataCounts }: LoadingOverlayProps) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  const totalLoaded = CATEGORIES.filter(c => categoryStatus[c.id] === 'loaded' || categoryStatus[c.id] === 'error').length
  const totalAll = CATEGORIES.length
  const allDone = CATEGORIES.every(c => categoryStatus[c.id] === 'loaded' || categoryStatus[c.id] === 'error')

  useEffect(() => {
    if (allDone && visible && !fading) {
      setFading(true)
      const t = setTimeout(() => setVisible(false), 800)
      return () => clearTimeout(t)
    }
  }, [allDone, visible, fading])

  if (!visible) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-slate-100">
            {allDone ? 'All Data Loaded' : 'Fetching Data...'}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {totalLoaded}/{totalAll} categories complete
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 mb-5">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${(totalLoaded / totalAll) * 100}%` }}
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {CATEGORIES.map(cat => {
            const status = categoryStatus[cat.id]
            const count = dataCounts[cat.id]
            return (
              <div
                key={cat.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  status === 'loading'
                    ? 'bg-slate-800/80 border border-indigo-500/30'
                    : status === 'error'
                      ? 'bg-red-900/20 border border-red-800/30'
                      : 'bg-transparent'
                }`}
              >
                <StatusIcon status={status} />
                <span className="text-base leading-none">{cat.icon}</span>
                <span className={`flex-1 text-sm ${status === 'loaded' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {cat.label}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {status === 'loaded' ? `${count.withData}/${count.total}` : status === 'loading' ? '...' : status === 'error' ? 'error' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}