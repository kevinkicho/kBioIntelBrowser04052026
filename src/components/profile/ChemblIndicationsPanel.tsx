'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ChemblIndication } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import {
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
} from '@/lib/chemblLinks'

const phaseColors: Record<number, { bg: string; label: string }> = {
  4: { bg: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30', label: 'Phase 4' },
  3: { bg: 'bg-blue-900/40 text-blue-300 border-blue-700/30', label: 'Phase 3' },
  2: { bg: 'bg-amber-900/40 text-amber-300 border-amber-700/30', label: 'Phase 2' },
  1: { bg: 'bg-slate-700/40 text-slate-300 border-slate-600/30', label: 'Phase 1' },
}

export const ChemblIndicationsPanel = memo(function ChemblIndicationsPanel({
  indications,
  panelId,
  lastFetched,
  diseaseName,
}: {
  indications: ChemblIndication[]
  panelId?: string
  lastFetched?: Date
  diseaseName?: string
}) {
  const sortedIndications = useMemo(() => {
    if (!diseaseName) return indications
    const matched = indications.filter((ind) => {
      const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
      return isMatch(text, diseaseName)
    })
    const nonMatched = indications.filter((ind) => {
      const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
      return !isMatch(text, diseaseName)
    })
    return [...matched, ...nonMatched]
  }, [indications, diseaseName])

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<ChemblIndication>(
        (ind) => ind.maxPhaseForIndication ?? ind.maxPhase ?? 0,
        {
          high: 'Highest phase',
          low: 'Lowest phase',
          idPrefix: 'phase',
        },
      ),
      ...alphaSortOptions<ChemblIndication>(
        (ind) => ind.meshHeading || ind.efoTerm || ind.condition || '',
      ),
    ],
    [],
  )

  const isEmpty = !Array.isArray(indications) || indications.length === 0

  const matchCount =
    !isEmpty && diseaseName
      ? sortedIndications.filter((ind) => {
          const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
          return isMatch(text, diseaseName)
        }).length
      : 0

  // Infer molecule ChEMBL id from first indication URL if encoded
  const compoundFromUrl = useMemo(() => {
    for (const ind of indications) {
      const m = ind.url?.match(/CHEMBL\d+/i)
      if (m) return m[0].toUpperCase()
    }
    return null
  }, [indications])

  const moleculeCardHref =
    chemblCompoundIndicationsUrl(compoundFromUrl) || chemblCompoundUrl(compoundFromUrl)

  const titleExtra = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!isEmpty && diseaseName && matchCount > 0 && (
        <span className="text-xs font-normal text-amber-300">
          {matchCount} relevant to {diseaseName}
        </span>
      )}
      {moleculeCardHref && (
        <a
          href={moleculeCardHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-normal text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          ChEMBL compound (indications) ↗
        </a>
      )}
    </span>
  )

  return (
    <Panel
      title="Drug Indications (ChEMBL)"
      panelId={panelId}
      lastFetched={lastFetched}
      titleExtra={titleExtra}
      empty={isEmpty ? 'No drug indication data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={sortedIndications}
          getSearchText={(ind) =>
            [ind.meshHeading, ind.efoTerm, ind.condition, ind.meshId, ind.efoId, ind.moleculeName]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="phase-desc"
          filterPlaceholder="Filter indications…"
          getKey={(ind, i) => `${ind.indicationId || ind.meshId || ind.efoId}-${i}`}
          className="space-y-3"
          renderItem={(ind) => {
            const phase = phaseColors[ind.maxPhaseForIndication] ?? phaseColors[1]
            const displayName = ind.meshHeading || ind.efoTerm || 'Unknown indication'
            const displayId = ind.meshId || ind.efoId || ''
            const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
            const diseaseMatch = diseaseName ? isMatch(text, diseaseName) : false
            const href =
              ind.url && ind.url.includes('chembl') && !ind.url.includes('/g/#browse')
                ? ind.url
                : chemblIndicationDeepLink({
                    moleculeChemblId: compoundFromUrl,
                    meshId: ind.meshId,
                    efoId: ind.efoId,
                    condition: displayName,
                  })
            const meshHref = ind.meshId
              ? `https://meshb.nlm.nih.gov/record/ui?ui=${encodeURIComponent(ind.meshId.replace(/^MESH:/i, ''))}`
              : null
            const efoHref = ind.efoId
              ? `https://www.ebi.ac.uk/ols4/ontologies/efo/terms?iri=${encodeURIComponent(
                  ind.efoId.includes('http')
                    ? ind.efoId
                    : `http://www.ebi.ac.uk/efo/${ind.efoId.replace(':', '_')}`,
                )}`
              : null
            return (
              <div
                className={`py-3 border-b border-slate-700 last:border-0 ${diseaseMatch ? 'bg-amber-950/20 -mx-4 px-4 rounded-md' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                    title="Open in ChEMBL / ontology"
                  >
                    {displayName}
                    <span className="ml-1 text-[10px] text-cyan-500/80" aria-hidden>
                      ↗
                    </span>
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {diseaseMatch && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                        Match
                      </span>
                    )}
                    <span className={`text-xs border px-2 py-0.5 rounded ${phase.bg}`}>
                      {phase.label}
                    </span>
                  </div>
                </div>
                {displayId && (
                  <p className="text-xs text-slate-500 mt-1 font-mono">{displayId}</p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                  {meshHref && (
                    <a
                      href={meshHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400/90 hover:underline"
                    >
                      MeSH ↗
                    </a>
                  )}
                  {efoHref && (
                    <a
                      href={efoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400/90 hover:underline"
                    >
                      EFO ↗
                    </a>
                  )}
                  {moleculeCardHref && (
                    <a
                      href={moleculeCardHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400/90 hover:underline"
                    >
                      ChEMBL molecule ↗
                    </a>
                  )}
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
