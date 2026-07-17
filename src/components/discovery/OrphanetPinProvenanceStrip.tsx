'use client'

import type { OrphanetPinProvenance } from '@/app/discover/hooks/useDiscovery'

export interface OrphanetPinProvenanceStripProps {
  provenance: OrphanetPinProvenance | null
  onRerank?: () => void
  rerankDisabled?: boolean
}

/**
 * Shows Orphanet gene pin provenance + optional user-triggered re-rank (v2.1).
 */
export function OrphanetPinProvenanceStrip({
  provenance,
  onRerank,
  rerankDisabled,
}: OrphanetPinProvenanceStripProps) {
  if (!provenance || provenance.added <= 0) return null

  return (
    <div
      className="mb-4 rounded-lg border border-violet-800/40 bg-violet-950/20 px-3 py-2 text-xs text-violet-100/90"
      data-testid="orphanet-provenance-strip"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-violet-200">Orphanet rare-disease pins</span>
          <p className="mt-0.5 text-[11px] text-violet-300/80">
            Merged {provenance.added} gene
            {provenance.added === 1 ? '' : 's'}
            {provenance.diseaseName ? (
              <>
                {' '}
                for <span className="text-violet-100">{provenance.diseaseName}</span>
              </>
            ) : null}
            {provenance.orphaCode ? (
              <span className="ml-1 font-mono text-[10px] text-violet-400">
                ORPHA:{provenance.orphaCode}
              </span>
            ) : null}
            . Free Orphadata only — not a diagnosis.
          </p>
          {provenance.genes.length > 0 && (
            <p className="mt-1 font-mono text-[10px] text-violet-400/90">
              {provenance.genes.slice(0, 12).join(', ')}
              {provenance.genes.length > 12 ? '…' : ''}
            </p>
          )}
        </div>
        {onRerank && (
          <button
            type="button"
            onClick={onRerank}
            disabled={rerankDisabled}
            className="shrink-0 rounded-lg border border-violet-700/50 bg-violet-900/40 px-3 py-1.5 text-[11px] font-medium text-violet-100 hover:bg-violet-800/50 disabled:opacity-50"
            data-testid="orphanet-rerank-cta"
          >
            Re-rank with pins
          </button>
        )}
      </div>
    </div>
  )
}
