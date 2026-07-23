'use client'

import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { HelperTip } from '@/components/ui/HelperTip'
import type { CompToxData } from '@/lib/types'
import { buildEchaDeepLinks } from '@/lib/echaLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const CompToxPanel = memo(function CompToxPanel({
  data,
  panelId,
  lastFetched,
}: {
  data: CompToxData | null
  panelId?: string
  lastFetched?: Date
}) {
  const isEmpty = !data

  return (
    <Panel
      title="EPA CompTox Dashboard"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No CompTox data available for this molecule.' : undefined}
    >
      {!isEmpty && data && (() => {
        const cas = data.casNumber || data.casrn
        const echa = buildEchaDeepLinks({
          cas,
          name: data.chemicalName,
        })
        const hasToxcastCounts =
          data.toxcastAvailable === true ||
          (data.toxcastAvailable !== false && data.toxcastTotal > 0)
        const pct =
          hasToxcastCounts && data.toxcastTotal > 0
            ? (data.toxcastActive / data.toxcastTotal) * 100
            : 0
        const synonyms = (data.synonyms || []).filter(Boolean).slice(0, 8)

        return (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Chemical
              </span>
              <p className="text-sm text-slate-100 font-medium mt-0.5">
                {data.chemicalName || 'Unknown'}
              </p>
              {data.dtxsid && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">{data.dtxsid}</p>
              )}
            </div>

            {cas && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  CAS Number
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded font-mono">
                    {cas}
                  </span>
                  {echa.casSearchUrl && (
                    <a
                      href={echa.casSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline"
                      data-testid="echa-cas-link"
                      onClick={() =>
                        onDeepLinkClick('other', echa.casSearchUrl!, {
                          panelId: panelId || 'comptox',
                          label: cas,
                        })
                      }
                    >
                      ECHA (CAS)
                    </a>
                  )}
                  <a
                    href={echa.chemSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    data-testid="echa-chem-link"
                    onClick={() =>
                      onDeepLinkClick('other', echa.chemSearchUrl, {
                        panelId: panelId || 'comptox',
                        label: cas || data.chemicalName,
                      })
                    }
                  >
                    ECHA CHEM
                  </a>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  EU chemical portal deep links (REACH / C&amp;L) — free public UI, not a bulk API.
                </p>
              </div>
            )}

            {(data.molecularFormula || data.molecularWeight > 0) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {data.molecularFormula && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">
                      Formula
                    </span>
                    <p className="text-slate-200 font-mono mt-0.5">{data.molecularFormula}</p>
                  </div>
                )}
                {data.molecularWeight > 0 && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">
                      Mol. weight
                    </span>
                    <p className="text-slate-200 font-mono mt-0.5">
                      {data.molecularWeight.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {synonyms.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Synonyms
                </span>
                <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                  {synonyms.join(' · ')}
                </p>
              </div>
            )}

            {hasToxcastCounts ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ToxCast Activity
                  </span>
                  <span className="text-sm text-slate-200 font-mono">
                    {data.toxcastActive} / {data.toxcastTotal}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, pct)).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {pct.toFixed(1)}% active assays
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/40 px-3 py-2">
                <p className="text-xs font-medium text-slate-300">ToxCast assay counts</p>
                <HelperTip
                  content="Not available from the free CompTox search API (detail/ToxCast endpoints no longer return public counts). Open the CompTox Dashboard for bioactivity and ToxCast tables, or check the separate ToxCast panel when assay rows load."
                  label="About ToxCast counts"
                  testId="comptox-toxcast-help"
                />
              </div>
            )}

            {data.exposurePrediction && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Exposure Prediction
                </span>
                <p className="text-sm text-slate-300 mt-1">{data.exposurePrediction}</p>
              </div>
            )}

            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              View on CompTox Dashboard →
            </a>
          </div>
        )
      })()}
    </Panel>
  )
})
