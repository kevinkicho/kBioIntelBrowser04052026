'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { MyChemAnnotation } from '@/lib/types'
import { mychemDeepLinks } from '@/lib/api/mychem'
import { isBrokenSourceShellUrl, preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface MyChemPanelProps {
  chemicals?: MyChemAnnotation[]
  panelId?: string
  lastFetched?: Date
}

function displayName(chem: MyChemAnnotation): string {
  if (chem.name?.trim() && chem.name.trim().toLowerCase() !== 'unknown compound') {
    return chem.name.trim()
  }
  if (chem.chebi?.name) return chem.chebi.name
  if (chem.chemblId) return chem.chemblId
  if (chem.drugbankId) return chem.drugbankId
  if (chem.pubchemCid) return `PubChem CID ${chem.pubchemCid}`
  if (chem.inchiKey) return chem.inchiKey
  return 'Unknown compound'
}

export const MyChemPanel = memo(function MyChemPanel({
  chemicals,
  panelId,
  lastFetched,
}: MyChemPanelProps) {
  const list = Array.isArray(chemicals) ? chemicals : []
  const isEmpty = list.length === 0
  const title = isEmpty ? 'MyChem' : 'MyChem.info Annotations'

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<MyChemAnnotation>((c) => displayName(c)),
      ...numberSortOptions<MyChemAnnotation>((c) => c.molecularWeight || 0, {
        high: 'Highest MW',
        low: 'Lowest MW',
        idPrefix: 'mw',
      }),
      ...numberSortOptions<MyChemAnnotation>((c) => c.chembl?.maxPhase ?? 0, {
        high: 'Highest phase',
        low: 'Lowest phase',
        idPrefix: 'phase',
      }),
    ],
    [],
  )

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No chemical annotations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(chem) =>
            [
              displayName(chem),
              chem.inchiKey,
              chem.chemblId,
              chem.pubchemCid,
              chem.chebiId,
              chem.drugbankId,
              chem.formula,
              ...(chem.synonyms || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter chemicals (name, ID, formula…)"
          getKey={(chem, idx) =>
            `${chem.inchiKey || chem.chemblId || chem.pubchemCid || chem.chebiId || idx}`
          }
          pageSize={8}
          className="space-y-0"
          renderItem={(chem, index) => {
            const links = mychemDeepLinks(chem)
            const primaryHref = preferStableDeepLink(
              isBrokenSourceShellUrl(chem.url) ? null : chem.url,
              links.mychem ||
                links.chembl ||
                links.pubchem ||
                links.drugbank ||
                links.chebi ||
                'https://mychem.info/',
            )
            const titleName = displayName(chem)
            const phase = chem.chembl?.maxPhase
            const emptyPhase = isEmptyMetric(phase ?? 0)

            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1.3fr)_4.5rem_4rem_3.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Name / IDs</span>
                    <span>Formula</span>
                    <span>MW</span>
                    <span className="text-right">Phase</span>
                  </div>
                )}
                <a
                  href={primaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${titleName}`}
                  className="grid grid-cols-[minmax(0,1.3fr)_4.5rem_4rem_3.5rem] gap-x-2 items-start px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate">
                      {titleName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                      {chem.chemblId && links.chembl && (
                        <span className="text-green-400/90 font-mono">{chem.chemblId}</span>
                      )}
                      {chem.pubchemCid && (
                        <span className="text-blue-400/90 font-mono">CID {chem.pubchemCid}</span>
                      )}
                      {chem.drugbankId && (
                        <span className="text-purple-400/90 font-mono">{chem.drugbankId}</span>
                      )}
                      {chem.chebiId && (
                        <span className="text-orange-400/90 font-mono">{chem.chebiId}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono text-slate-400 truncate ${emptyDataClass(isEmptyMetric(chem.formula))}`}
                  >
                    {chem.formula || '—'}
                  </span>
                  <span
                    className={`text-xs tabular-nums text-slate-400 ${emptyDataClass(isEmptyMetric(chem.molecularWeight))}`}
                  >
                    {chem.molecularWeight > 0 ? chem.molecularWeight.toFixed(1) : '—'}
                  </span>
                  <span
                    className={`text-xs text-right tabular-nums text-slate-400 ${emptyDataClass(emptyPhase)}`}
                  >
                    {phase != null && phase > 0 ? phase : '—'}
                  </span>
                </a>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
