'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import {
  buildInternationalRegulatorLinks,
  type RegulatorDeepLink,
} from '@/lib/regulatorDeepLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_STYLE: Record<RegulatorDeepLink['kind'], string> = {
  search: 'border-indigo-800/40 bg-indigo-950/30 text-indigo-300',
  download: 'border-amber-800/40 bg-amber-950/30 text-amber-300',
  portal: 'border-slate-700 bg-slate-900/50 text-slate-400',
}

export const InternationalRegulatorsPanel = memo(function InternationalRegulatorsPanel({
  moleculeName,
  panelId,
  lastFetched,
}: {
  moleculeName: string
  panelId?: string
  lastFetched?: Date
}) {
  const links = useMemo(
    () => buildInternationalRegulatorLinks(moleculeName || ''),
    [moleculeName],
  )

  return (
    <Panel
      title="International regulators"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        !moleculeName?.trim()
          ? 'No molecule name available for regulator deep links.'
          : undefined
      }
    >
      {links.length > 0 && (
        <div className="space-y-3" data-testid="international-regulators-panel">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Official public search / download portals (UK MHRA, AU TGA, JP PMDA, EU EMA, CA/US).
            Portal-first — no scrape. Not clinical decision support.
          </p>
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200">{link.label}</span>
                    <span className="text-[9px] rounded border border-slate-700 px-1.5 py-0.5 text-slate-500">
                      {link.region}
                    </span>
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
                  data-testid={`regulator-link-${link.id}`}
                  onClick={() =>
                    onDeepLinkClick('other', link.url, {
                      panelId: panelId || 'international-regulators',
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
