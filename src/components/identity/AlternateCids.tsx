'use client'

import Link from 'next/link'
import { mergeAlternateCids } from '@/lib/domain'

export interface AlternateCidsProps {
  /** Primary PubChem CID (excluded from the list). */
  primaryCid?: number | null
  /** Alternate CIDs from identity resolution / xrefs. */
  alternateCids?: number[]
  /** Extra query string for molecule links (e.g. project=…). */
  linkQuery?: string
  className?: string
  /** Compact inline chip style for dense tables. */
  compact?: boolean
  /** Max CIDs to show before “+N more”. Default 4. */
  maxVisible?: number
}

/**
 * Surfaces alternate PubChem CIDs when present (design: MoleculeIdentity.alternateCids).
 * Uses domain `mergeAlternateCids` to exclude primary and dedupe.
 */
export function AlternateCids({
  primaryCid,
  alternateCids,
  linkQuery,
  className = '',
  compact = false,
  maxVisible = 4,
}: AlternateCidsProps) {
  const alts = mergeAlternateCids(primaryCid, alternateCids)
  if (alts.length === 0) return null

  const visible = alts.slice(0, maxVisible)
  const rest = alts.length - visible.length
  const qs = linkQuery
    ? linkQuery.startsWith('?')
      ? linkQuery
      : `?${linkQuery}`
    : ''

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1 text-[10px] text-slate-500 ${className}`}
        data-testid="alternate-cids"
      >
        <span className="text-slate-600">Alt</span>
        {visible.map((cid) => (
          <Link
            key={cid}
            href={`/molecule/${cid}${qs}`}
            className="rounded border border-slate-700/60 bg-slate-800/40 px-1 py-0.5 font-mono text-slate-400 hover:border-cyan-700/50 hover:text-cyan-300"
            title={`Alternate PubChem CID ${cid}`}
          >
            {cid}
          </Link>
        ))}
        {rest > 0 && <span className="text-slate-600">+{rest}</span>}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 text-[10px] ${className}`}
      data-testid="alternate-cids"
    >
      <span className="text-slate-500 font-medium">Alternate CIDs</span>
      {visible.map((cid) => (
        <Link
          key={cid}
          href={`/molecule/${cid}${qs}`}
          className="rounded border border-amber-800/40 bg-amber-900/15 px-1.5 py-0.5 font-mono text-amber-300/90 hover:border-amber-600/50 hover:text-amber-200"
          title={`Alternate PubChem CID ${cid} — may be a different structure or tautomer`}
        >
          CID {cid}
        </Link>
      ))}
      {rest > 0 && (
        <span className="text-slate-600" title={alts.slice(maxVisible).join(', ')}>
          +{rest} more
        </span>
      )}
    </div>
  )
}
