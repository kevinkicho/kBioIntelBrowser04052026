'use client'

import { useState, useRef, useEffect } from 'react'
import { consolidateCitations } from '@/lib/cite/consolidate'
import { formatBibtex, formatRis, type CitationContext } from '@/lib/cite/formatters'

interface CiteButtonProps {
  data: Record<string, unknown>
  entityName: string
  entityType: 'molecule' | 'gene' | 'disease'
  entityId: string | number
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function CiteButton({ data, entityName, entityType, entityId }: CiteButtonProps) {
  const [open, setOpen] = useState(false)
  const [snapshotState, setSnapshotState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sources = consolidateCitations(data)
  const ctx: CitationContext = {
    entityName,
    entityType,
    entityId,
    accessedAt: new Date().toISOString(),
  }
  const slug = entityName.toLowerCase().replace(/\s+/g, '-')

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
  }

  async function copySnapshotLink() {
    setSnapshotState('loading')
    try {
      const res = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: { type: entityType, id: entityId, name: entityName },
          data,
        }),
      })
      if (!res.ok) throw new Error(`Snapshot failed: ${res.status}`)
      const { id } = await res.json()
      const baseUrl = `${window.location.origin}/${entityType}/${entityId}?snapshot=${id}`
      copy(baseUrl)
      setSnapshotState('copied')
      setTimeout(() => setSnapshotState('idle'), 2000)
    } catch {
      setSnapshotState('error')
      setTimeout(() => setSnapshotState('idle'), 3000)
    }
  }

  if (sources.length === 0) return null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
      >
        Cite ▼
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[240px]">
          <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-700">
            {sources.length} sources contributed
          </div>
          <button
            onClick={() => { copy(formatBibtex(sources, ctx)); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Copy BibTeX
          </button>
          <button
            onClick={() => { copy(formatRis(sources, ctx)); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Copy RIS
          </button>
          <div className="border-t border-slate-700" />
          <button
            onClick={() => { downloadFile(formatBibtex(sources, ctx), `${slug}-citations.bib`, 'application/x-bibtex'); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Download .bib
          </button>
          <button
            onClick={() => { downloadFile(formatRis(sources, ctx), `${slug}-citations.ris`, 'application/x-research-info-systems'); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Download .ris
          </button>
          <div className="border-t border-slate-700" />
          <button
            onClick={copySnapshotLink}
            disabled={snapshotState === 'loading'}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-b-lg disabled:opacity-50"
          >
            {snapshotState === 'idle' && 'Copy snapshot link'}
            {snapshotState === 'loading' && 'Saving snapshot…'}
            {snapshotState === 'copied' && '✓ Snapshot link copied'}
            {snapshotState === 'error' && '✗ Snapshot failed'}
          </button>
        </div>
      )}
    </div>
  )
}
