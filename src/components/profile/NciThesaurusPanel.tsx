'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { NciConcept } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { DescriptionTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export const NciThesaurusPanel = memo(function NciThesaurusPanel({
  concepts,
  panelId,
  lastFetched,
}: {
  concepts: NciConcept[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(concepts) ? concepts : []
  const isEmpty = list.length === 0
  const withDef = list.filter((c) => Boolean(c.definition?.trim())).length

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<NciConcept>((c) => c.name || ''),
      ...alphaSortOptions<NciConcept>((c) => c.code || c.conceptId || '').map((o) => ({
        ...o,
        id: `code-${o.id}`,
        label: o.id.includes('asc') ? 'Code A–Z' : 'Code Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={
        isEmpty
          ? 'NCI Thesaurus'
          : `NCI Thesaurus (${list.length}${withDef ? ` · ${withDef} with definition` : ''})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No NCI Thesaurus concepts found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(concept) =>
            [
              concept.name,
              concept.code,
              concept.conceptId,
              concept.semanticType,
              concept.definition,
              concept.conceptStatus,
              ...(concept.synonyms || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter concepts (name, code, definition…)"
          getKey={(concept, i) => `${concept.code || concept.conceptId}-${i}`}
          renderItem={(concept) => {
            const def = concept.definition?.trim() || ''
            return (
              <div
                className="py-2 border-b border-slate-700/60 last:border-0"
                data-testid="nci-concept-row"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StyledTooltip
                      content={
                        concept.url ? `Open ${concept.name} in NCI Thesaurus` : undefined
                      }
                    >
                      <a
                        href={concept.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          onDeepLinkClick('nci', concept.url, {
                            panelId: 'nci-thesaurus',
                            label: concept.name || concept.code,
                          })
                        }
                        className="text-sm font-medium text-slate-100 hover:text-cyan-300"
                      >
                        {concept.name}
                      </a>
                    </StyledTooltip>
                    <span className="text-[10px] font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
                      {concept.code || concept.conceptId}
                    </span>
                    {concept.conceptStatus &&
                      concept.conceptStatus !== 'DEFAULT' && (
                        <span className="text-[10px] bg-slate-700/60 text-slate-400 border border-slate-600/40 px-1.5 py-0.5 rounded">
                          {concept.conceptStatus}
                        </span>
                      )}
                  </div>
                  {concept.semanticType && (
                    <p className="mt-0.5 text-[10px] text-slate-500">{concept.semanticType}</p>
                  )}
                  {def ? (
                    <div className="mt-1" data-testid="nci-concept-definition">
                      <DescriptionTip text={def} label="Definition" />
                    </div>
                  ) : (
                    <span className="mt-1 inline-block text-[10px] text-slate-600 italic">
                      No definition
                    </span>
                  )}
                  {concept.synonyms?.length > 0 && (
                    <DescriptionTip
                      text={concept.synonyms.join(', ')}
                      label={`Synonyms (${concept.synonyms.length})`}
                      className="mt-0.5"
                    />
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
