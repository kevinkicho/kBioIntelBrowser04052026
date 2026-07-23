'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import {
  buildEstablishmentDeepLinks,
  type EstablishmentDeepLink,
} from '@/lib/establishmentDeepLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_STYLE: Record<EstablishmentDeepLink['kind'], string> = {
  search: 'border-indigo-800/40 bg-indigo-950/30 text-indigo-300',
  portal: 'border-slate-700 bg-slate-900/50 text-slate-400',
  registry: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300',
}

export const EstablishmentLinksPanel = memo(function EstablishmentLinksPanel({
  firmHint,
  panelId,
  lastFetched,
}: {
  /** Sponsor / applicant / molecule name used for search hints */
  firmHint: string
  panelId?: string
  lastFetched?: Date
}) {
  const links = useMemo(() => buildEstablishmentDeepLinks(firmHint || ''), [firmHint])

  return (
    <Panel
      title="Manufacturing & establishments"
      panelId={panelId}
      lastFetched={lastFetched}
      help="Portal-first FDA establishment resources (FEI, DRLS, inspections). There is no free public API that joins every BLA to certified plants — search official registries by firm name. Not a certification graph or GMP advice."
      empty={
        !firmHint?.trim()
          ? 'No firm or product name available for establishment deep links.'
          : undefined
      }
    >
      {links.length > 0 && (
        <div className="space-y-3" data-testid="establishment-links-panel">
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200">{link.label}</span>
                    <span
                      className={`text-[9px] rounded border px-1.5 py-0.5 ${KIND_STYLE[link.kind]}`}
                    >
                      {link.kind}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{link.description}</p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-indigo-400 hover:underline"
                  data-testid={`establishment-link-${link.id}`}
                  onClick={() =>
                    onDeepLinkClick('other', link.url, {
                      panelId: panelId || 'establishment-links',
                      label: link.id,
                    })
                  }
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
})
