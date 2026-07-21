'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { probePubChem3dClient } from '@/lib/api/pubchem3d'
import { buildStructureImageUrl } from '@/lib/utils'
import { emitProductEvent } from '@/lib/productEvents'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface Props {
  cid: number
  name: string
  /** 2D structure image used when PubChem has no 3D conformer */
  fallbackImageUrl?: string
  /**
   * When provided by parent after preflight, skip internal check.
   * `true` = has 3D, `false` = no 3D, `null`/`undefined` = probe here.
   */
  has3d?: boolean | null
}

type ViewState =
  | { status: 'checking' }
  | { status: 'ready3d' }
  | { status: 'no3d' }
  | { status: 'error'; message: string }

/**
 * MolView balls embed requires PubChem 3D SDF. When that 404s, MolView throws
 * uncaught TypeError on `.replace` inside the iframe — so we preflight and
 * fall back to the 2D structure image instead of loading a broken embed.
 */
export function MoleculeViewer3D({ cid, name, fallbackImageUrl, has3d: has3dProp }: Props) {
  const [state, setState] = useState<ViewState>(() =>
    has3dProp === true
      ? { status: 'ready3d' }
      : has3dProp === false
        ? { status: 'no3d' }
        : { status: 'checking' },
  )
  const imageUrl = fallbackImageUrl || buildStructureImageUrl(cid)

  useEffect(() => {
    if (has3dProp === true) {
      setState({ status: 'ready3d' })
      return
    }
    if (has3dProp === false) {
      setState({ status: 'no3d' })
      emitProductEvent('ui_surface_action', {
        surface: 'structure_3d',
        action: 'fallback_2d',
        cid,
      })
      return
    }

    let cancelled = false
    setState({ status: 'checking' })

    void (async () => {
      try {
        const ok = await probePubChem3dClient(cid)
        if (cancelled) return
        setState(ok ? { status: 'ready3d' } : { status: 'no3d' })
        emitProductEvent('ui_surface_action', {
          surface: 'structure_3d',
          action: ok ? 'molview_ready' : 'fallback_2d',
          cid,
        })
      } catch {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'Could not check 3D availability',
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [cid, has3dProp])

  if (state.status === 'checking') {
    return (
      <div
        className="bg-slate-800 rounded-xl overflow-hidden w-32 h-32 md:w-48 md:h-48 flex flex-col items-center justify-center gap-2"
        data-testid="molecule-viewer-checking"
      >
        <div className="h-6 w-6 rounded-full border-2 border-slate-600 border-t-indigo-400 animate-spin" />
        <span className="text-[10px] text-slate-500">Checking 3D…</span>
      </div>
    )
  }

  if (state.status === 'ready3d') {
    return (
      <div
        className="bg-slate-800 rounded-xl overflow-hidden w-32 h-32 md:w-48 md:h-48"
        data-testid="molecule-viewer-3d"
      >
        <iframe
          src={`https://embed.molview.org/v1/?mode=balls&cid=${cid}&bg=1e293b`}
          title={`3D structure of ${name}`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    )
  }

  const detail =
    state.status === 'error'
      ? state.message
      : 'PubChem has no 3D conformer for this CID (common for peptides, salts, and some large molecules). Showing 2D structure.'

  return (
    <StyledTooltip content={detail} className="w-32 h-32 md:w-48 md:h-48">
    <div
      className="bg-slate-800 rounded-xl overflow-hidden w-32 h-32 md:w-48 md:h-48 relative flex flex-col"
      data-testid="molecule-viewer-fallback"
    >
      <div className="flex-1 bg-white flex items-center justify-center p-2 min-h-0">
        <Image
          src={imageUrl}
          alt={`2D structure of ${name} (no 3D model)`}
          width={160}
          height={160}
          className="object-contain max-h-full w-auto"
          unoptimized
        />
      </div>
      <div className="px-1.5 py-1 bg-slate-900/95 border-t border-slate-700">
        <p className="text-[9px] text-amber-300/90 leading-tight text-center line-clamp-2">
          No 3D model — 2D shown
        </p>
      </div>
    </div>
    </StyledTooltip>
  )
}
