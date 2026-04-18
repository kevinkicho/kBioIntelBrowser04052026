'use client'

import { useState } from 'react'
import { getFreshnessStatus } from '@/lib/dataFreshness'
import { getPanelSource } from '@/lib/panelSources'

interface PanelProps {
  title: string
  panelId?: string
  lastFetched?: Date
  children: React.ReactNode
  className?: string
  titleExtra?: React.ReactNode
}

export function Panel({ title, panelId, lastFetched, children, className = '', titleExtra }: PanelProps) {
  const [showSource, setShowSource] = useState(false)
  const freshness = panelId && lastFetched ? getFreshnessStatus(panelId, lastFetched) : null
  const sourceInfo = panelId ? getPanelSource(panelId) : null

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {titleExtra}
        </div>
        {freshness && (
          <span className={`text-xs ${freshness.colorClass}`}>
            {freshness.statusText}
          </span>
        )}
      </div>
      {children}
      {sourceInfo && (
        <div className="mt-3 pt-2 border-t border-slate-700/40">
          <button
            onClick={() => setShowSource(!showSource)}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg className={`w-3 h-3 transition-transform ${showSource ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Source: {sourceInfo.source}</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono">{sourceInfo.api}</span>
          </button>
          {showSource && (
            <div className="mt-1.5 space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">API</span>
                <span className="font-mono text-slate-400">{sourceInfo.api}</span>
                <span className="text-slate-600">by</span>
                <span className="text-slate-400">{sourceInfo.source}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">Docs</span>
                {sourceInfo.docs ? (
                  <a href={sourceInfo.docs} target="_blank" rel="noopener noreferrer" className="font-mono text-cyan-400/70 hover:text-cyan-300 break-all">{sourceInfo.docs}</a>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">Fetch</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(sourceInfo.endpoint)}
                  className="font-mono text-emerald-400/70 hover:text-emerald-300 break-all text-left"
                >
                  {sourceInfo.endpoint}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}