'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ChemblIndication } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import {
  chemblCompoundIndicationsSectionUrl,
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
  extractChemblId,
  isStableChemblDeepLink,
  normalizeChemblId,
} from '@/lib/chemblLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

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

  // Prefer explicit moleculeChemblId, else recover from stored URL (legacy rows)
  const moleculeChemblId = useMemo(() => {
    for (const ind of indications) {
      const fromField = normalizeChemblId(ind.moleculeChemblId)
      if (fromField) return fromField
    }
    for (const ind of indications) {
      const fromUrl = extractChemblId(ind.url)
      if (fromUrl) return fromUrl
    }
    return null
  }, [indications])

  const moleculeCardHref =
    chemblCompoundIndicationsUrl(moleculeChemblId) ||
    chemblCompoundIndicationsSectionUrl(moleculeChemblId) ||
    chemblCompoundUrl(moleculeChemblId)

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
          ChEMBL compound (indications)
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
          pageSize={8}
          className="space-y-0"
          renderItem={(ind, index) => {
            const phase = phaseColors[ind.maxPhaseForIndication] ?? phaseColors[1]
            const displayName = ind.meshHeading || ind.efoTerm || 'Unknown indication'
            const displayId = ind.meshId || ind.efoId || ''
            const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
            const diseaseMatch = diseaseName ? isMatch(text, diseaseName) : false
            const rowMolId =
              normalizeChemblId(ind.moleculeChemblId) ||
              extractChemblId(ind.url) ||
              moleculeChemblId
            // Always prefer condition-specific ontology (MeSH/EFO) or compound#DrugIndications.
            // Ignore stored legacy SPA / embed URLs that dump users in odd ChEMBL shells.
            const href =
              (isStableChemblDeepLink(ind.url) &&
              !/\/embed\//i.test(ind.url || '') &&
              !/\/g\/#/i.test(ind.url || '')
                ? ind.url
                : null) ||
              chemblIndicationDeepLink({
                moleculeChemblId: rowMolId,
                meshId: ind.meshId,
                efoId: ind.efoId,
                condition: displayName,
              })
            const openTitle = ind.meshId
              ? `Open MeSH: ${ind.meshId}`
              : ind.efoId
                ? `Open EFO: ${ind.efoId}`
                : rowMolId
                  ? `Open ChEMBL compound ${rowMolId} (Drug Indications)`
                  : 'Open indication source'
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_4.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Indication</span>
                    <span>ID</span>
                    <span className="text-right">Phase</span>
                  </div>
                )}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={openTitle}
                  data-testid={`chembl-indication-row-${ind.meshId || ind.efoId || displayName}`}
                  onClick={() =>
                    onDeepLinkClick('chembl', href, {
                      panelId: 'chembl-indications',
                      label: displayName,
                    })
                  }
                  className={`grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_4.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group ${
                    diseaseMatch ? 'bg-amber-950/20' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate">
                      {displayName}
                      {diseaseMatch && (
                        <span className="ml-1.5 text-[10px] text-amber-300 font-normal">Match</span>
                      )}
                    </div>
                  </div>
                  <StyledTooltip content={displayId || undefined}>
                    <span className="text-[11px] font-mono text-slate-500 truncate">
                      {displayId || '—'}
                    </span>
                  </StyledTooltip>
                  <span className={`text-[11px] text-right border px-1.5 py-0.5 rounded justify-self-end ${phase.bg}`}>
                    {phase.label.replace('Phase ', 'P')}
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
