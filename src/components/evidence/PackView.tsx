'use client'

import type { EvidencePack } from '@/lib/evidence'
import { MAX_PACK_CLAIMS } from '@/lib/evidence'

interface Props {
  pack: EvidencePack
  /** Compact summary (no per-claim list) */
  compact?: boolean
  className?: string
}

/**
 * Read-only view of a built evidence pack (metadata + claims).
 */
export function PackView({ pack, compact = false, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/40 ${className}`}
      data-testid="pack-view"
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-100">{pack.title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>
            {pack.claimCount}/{MAX_PACK_CLAIMS} claims
          </span>
          <span>{pack.candidates.length} candidates</span>
          <span className="font-mono text-slate-600" title={pack.contentHash}>
            hash {pack.contentHash.slice(0, 12)}…
          </span>
          <span>{new Date(pack.createdAt).toLocaleString()}</span>
        </div>
        {pack.disease?.name && (
          <div className="mt-2">
            <span className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-2 py-0.5 text-[11px] text-indigo-300">
              {pack.disease.name}
            </span>
          </div>
        )}
        {pack.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {pack.sources.map((s) => (
              <span
                key={s}
                className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-400"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          {pack.claims.length === 0 ? (
            <p className="text-sm text-slate-500">No claims in this pack.</p>
          ) : (
            <ul className="space-y-3">
              {pack.claims.map((c) => (
                <li key={c.id} className="border-b border-slate-800/80 pb-2 last:border-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="rounded border border-emerald-800/40 bg-emerald-900/20 px-1.5 py-0.5 text-emerald-300">
                      {c.claimType}
                    </span>
                    <span className="font-mono text-slate-600">{c.id}</span>
                    <span className="text-slate-600">{c.epistemicStatus}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{c.statement}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {c.provenance.sourceUrl ? (
                      <a
                        href={c.provenance.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400/90 hover:text-indigo-300 hover:underline"
                        data-testid="pack-claim-source-url"
                      >
                        {c.provenance.source} ↗
                      </a>
                    ) : (
                      c.provenance.source
                    )}
                    {c.provenance.retrievedAt
                      ? ` · ${new Date(c.provenance.retrievedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {compact && Object.keys(pack.claimTypes).length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2">
          {Object.entries(pack.claimTypes).map(([type, n]) => (
            <span
              key={type}
              className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400"
            >
              {type}: {n}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
