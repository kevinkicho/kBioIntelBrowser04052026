'use client'

import { useState, useRef, useEffect } from 'react'

interface ShareButtonProps {
  entityType: 'molecule' | 'gene' | 'disease'
  entityId: string | number
  entityName: string
  data?: Record<string, unknown>
}

type SnapshotState = 'idle' | 'loading' | 'copied' | 'error'

/**
 * ShareButton — small dropdown in the profile sticky header next to ExportButton + CiteButton.
 *
 * Two share options:
 *   - "Copy link"          → canonical URL `/{entityType}/{entityId}`
 *   - "Copy snapshot link" → POSTs to /api/snapshot to freeze the current data, then copies
 *                            `/{entityType}/{entityId}?snapshot={id}`. CiteButton has the same
 *                            snapshot option; this is convenience-duplicate by design.
 */
export function ShareButton({ entityType, entityId, entityName, data }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [linkState, setLinkState] = useState<'idle' | 'copied'>('idle')
  const [snapshotState, setSnapshotState] = useState<SnapshotState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function buildCanonicalUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/${entityType}/${entityId}`
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  async function copyCanonicalLink() {
    const ok = await copyText(buildCanonicalUrl())
    if (ok) {
      setLinkState('copied')
      setTimeout(() => setLinkState('idle'), 2000)
    } else {
      setErrorMessage('Clipboard not available')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  async function copySnapshotLink() {
    setSnapshotState('loading')
    setErrorMessage(null)
    try {
      const res = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: { type: entityType, id: entityId, name: entityName },
          data: data ?? {},
        }),
      })
      if (!res.ok) throw new Error(`Snapshot failed: ${res.status}`)
      const { id } = await res.json()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${origin}/${entityType}/${entityId}?snapshot=${id}`
      const ok = await copyText(url)
      if (!ok) throw new Error('Clipboard not available')
      setSnapshotState('copied')
      setTimeout(() => setSnapshotState('idle'), 2000)
    } catch (e) {
      setSnapshotState('error')
      setErrorMessage(e instanceof Error ? e.message : 'Snapshot failed')
      setTimeout(() => {
        setSnapshotState('idle')
        setErrorMessage(null)
      }, 3000)
    }
  }

  async function copyEmbedSnippet() {
    if (entityType !== 'molecule') return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const snippet = `<iframe src="${origin}/embed/molecule/${entityId}?panels=summary,structure" width="100%" height="600" frameborder="0"></iframe>`
    const ok = await copyText(snippet)
    if (ok) {
      setLinkState('copied')
      setTimeout(() => setLinkState('idle'), 2000)
    } else {
      setErrorMessage('Clipboard not available')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Share"
        aria-haspopup="menu"
        aria-expanded={open}
        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
      >
        Share ▼
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[220px]">
          <button
            onClick={copyCanonicalLink}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg"
          >
            {linkState === 'copied' ? '✓ Link copied' : 'Copy link'}
          </button>
          <button
            onClick={copySnapshotLink}
            disabled={snapshotState === 'loading'}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            {snapshotState === 'idle' && 'Copy snapshot link'}
            {snapshotState === 'loading' && 'Saving snapshot…'}
            {snapshotState === 'copied' && '✓ Snapshot link copied'}
            {snapshotState === 'error' && '✗ Snapshot failed'}
          </button>
          {entityType === 'molecule' && (
            <>
              <div className="border-t border-slate-700" />
              <button
                onClick={copyEmbedSnippet}
                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-b-lg"
              >
                Copy embed snippet
              </button>
            </>
          )}
          {errorMessage && (
            <div role="alert" className="px-4 py-2 text-xs text-red-400 border-t border-slate-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
