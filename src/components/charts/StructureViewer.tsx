'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  pdbId: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    $3Dmol: any
  }
}

function load3DmolScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://3Dmol.csb.pitt.edu/build/3Dmol-min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load 3Dmol.js'))
    document.head.appendChild(script)
  })
}

export function StructureViewer({ pdbId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await load3DmolScript()
        if (cancelled || !containerRef.current) return

        // Fetch PDB data
        const pdbUrl = `https://files.rcsb.org/download/${pdbId}.pdb`
        const res = await fetch(pdbUrl)
        if (!res.ok) throw new Error(`PDB ${pdbId} not found`)
        const pdbData = await res.text()
        if (cancelled) return

        // Create viewer
        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#0f172a',
          antialias: true,
        })

        viewer.addModel(pdbData, 'pdb')
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
        viewer.zoomTo()
        viewer.render()
        viewerRef.current = viewer
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load structure')
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (viewerRef.current) {
        try { viewerRef.current.clear() } catch {}
      }
    }
  }, [pdbId])

  // Handle resize
  useEffect(() => {
    function handleResize() {
      if (viewerRef.current) {
        viewerRef.current.resize()
        viewerRef.current.render()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className="w-full h-[350px] bg-slate-900/50 border border-red-800/30 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-1">Failed to load 3D structure</p>
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 relative">
      {loading && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading {pdbId} structure...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: '350px', position: 'relative' }}
      />
      <div className="absolute bottom-3 left-3 flex gap-2 z-10">
        <button
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } })
              viewerRef.current.render()
            }
          }}
          className="text-[9px] bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
        >
          Cartoon
        </button>
        <button
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.setStyle({}, { stick: { colorscheme: 'Jmol' } })
              viewerRef.current.render()
            }
          }}
          className="text-[9px] bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
        >
          Sticks
        </button>
        <button
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.setStyle({}, { sphere: { colorscheme: 'Jmol', scale: 0.3 }, stick: { colorscheme: 'Jmol' } })
              viewerRef.current.render()
            }
          }}
          className="text-[9px] bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
        >
          Ball & Stick
        </button>
        <button
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.setStyle({}, { surface: { opacity: 0.8, colorscheme: 'whiteCarbon' } })
              viewerRef.current.render()
            }
          }}
          className="text-[9px] bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
        >
          Surface
        </button>
      </div>
      <div className="absolute bottom-3 right-3 text-[8px] text-slate-600 z-10">
        🖱️ Drag to rotate · Scroll to zoom · Shift+drag to pan
      </div>
    </div>
  )
}
