'use client'

import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { EmaMedicineRecord } from '@/lib/api/emaMedicines'
import { getEmaBulkDownloadLinks } from '@/lib/api/emaBulk'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const EmaMedicinesPanel = memo(function EmaMedicinesPanel({
  medicines,
  panelId,
  lastFetched,
}: {
  medicines: EmaMedicineRecord[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(medicines) ? medicines : []
  const isEmpty = list.length === 0

  return (
    <Panel
      title="EMA / EU medicines"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No EU medicine metadata found (Open Targets + EMA search links).'
          : undefined
      }
    >
      {!isEmpty && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Structured fields from Open Targets (free GraphQL). Official product documents open on
            the EMA site — not clinical decision support. Bulk dumps (tier B):{' '}
            {getEmaBulkDownloadLinks()
              .filter((l) => l.id !== 'ema-biosimilars-topic')
              .slice(0, 3)
              .map((l, i, arr) => (
                <span key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', l.url, {
                        panelId: panelId || 'ema-medicines',
                        label: l.id,
                      })
                    }
                  >
                    {l.label} ↗
                  </a>
                  {i < arr.length - 1 ? ' · ' : ''}
                </span>
              ))}
          </p>
          {list.map((m) => (
            <div
              key={`${m.chemblId || m.name}`}
              className="py-3 border-b border-slate-700 last:border-0"
              data-testid="ema-medicine-row"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-100 text-sm">{m.name}</p>
                  {m.tradeNames.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Trade names: {m.tradeNames.slice(0, 6).join(', ')}
                      {m.tradeNames.length > 6 ? '…' : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.chemblId && (
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                      {m.chemblId}
                    </span>
                  )}
                  {m.yearOfFirstApproval != null && (
                    <span className="text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded">
                      First approval {m.yearOfFirstApproval}
                    </span>
                  )}
                  {m.hasBeenWithdrawn && (
                    <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-700/30 px-2 py-0.5 rounded">
                      Withdrawn (OT flag)
                    </span>
                  )}
                </div>
              </div>
              {(m.drugType || m.maximumClinicalTrialPhase != null) && (
                <p className="text-xs text-slate-400 mt-1">
                  {[m.drugType, m.maximumClinicalTrialPhase != null ? `max phase ${m.maximumClinicalTrialPhase}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <a
                  href={m.emaSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline"
                  onClick={() =>
                    onDeepLinkClick('other', m.emaSearchUrl, {
                      panelId: panelId || 'ema-medicines',
                      label: m.name,
                    })
                  }
                >
                  Search EMA website ↗
                </a>
                {m.openTargetsUrl && (
                  <a
                    href={m.openTargetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('opentargets', m.openTargetsUrl!, {
                        panelId: panelId || 'ema-medicines',
                        label: m.chemblId || m.name,
                      })
                    }
                  >
                    Open Targets drug ↗
                  </a>
                )}
                {m.eparProductInfoUrl && (
                  <a
                    href={m.eparProductInfoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-slate-400 hover:underline"
                    title="Best-effort EPAR product information PDF (may 404 if slug differs)"
                    onClick={() =>
                      onDeepLinkClick('other', m.eparProductInfoUrl!, {
                        panelId: panelId || 'ema-medicines',
                        label: 'epar-pdf',
                      })
                    }
                  >
                    EPAR product info PDF (guess) ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
})
