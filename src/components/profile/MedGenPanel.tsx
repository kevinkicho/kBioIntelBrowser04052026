'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DescriptionTip } from '@/components/ui/HelperTip'
import { ExpandableItems, ExpandableTextList } from '@/components/ui/ExpandableItems'
import type { MedGenConcept } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

function ConceptItem({ concept }: { concept: MedGenConcept }) {
  // Safeguard: ensure name is a string
  const displayName = typeof concept.name === 'string' ? concept.name : String(concept.name || 'Unknown Concept')
  // Safeguard: ensure semanticTypes is an array
  const semanticTypes = Array.isArray(concept.semanticTypes) ? concept.semanticTypes : []
  // Safeguard: ensure definition is a string
  const definition = typeof concept.definition === 'string' ? concept.definition : String(concept.definition || '')
  // Safeguard: ensure omimIds is an array
  const omimIds = Array.isArray(concept.omimIds) ? concept.omimIds : []

  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={concept.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-100 text-sm hover:text-cyan-400 transition-colors"
            >
              {displayName}
            </a>
            <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700/30 px-1.5 py-0.5 rounded shrink-0">
              {concept.conceptId}
            </span>
          </div>
          <DescriptionTip text={definition} label="Definition" />
          <div className="mt-1 space-y-1">
            {semanticTypes.length > 0 && (
              <ExpandableItems
                items={semanticTypes}
                maxVisible={6}
                className="flex flex-wrap gap-1"
                moreClassName="text-[10px] font-medium text-indigo-300 hover:text-indigo-200 cursor-pointer bg-transparent border-0 p-0"
                testId="medgen-semantic-types"
                renderItem={(type, i) => (
                  <span
                    key={`${type}-${i}`}
                    className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded"
                  >
                    {type}
                  </span>
                )}
              />
            )}
            {omimIds.length > 0 && (
              <ExpandableTextList
                items={omimIds}
                maxVisible={3}
                prefix="OMIM:"
                className="text-[10px] text-slate-600"
                testId="medgen-omim"
              />
            )}
          </div>
        </div>
        {concept.url && (
          <a
            href={concept.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300"
          >
            MedGen
          </a>
        )}
      </div>
    </div>
  )
}

export const MedGenPanel = memo(function MedGenPanel({
  concepts,
  panelId,
  lastFetched,
}: {
  concepts: MedGenConcept[]
  panelId?: string
  lastFetched?: Date
}) {
  const safeConcepts = Array.isArray(concepts) ? concepts : []
  const isEmpty = safeConcepts.length === 0

  const sortOptions = useMemo(
    () =>
      alphaSortOptions<MedGenConcept>((c) =>
        typeof c.name === 'string' ? c.name : String(c.name || ''),
      ),
    [],
  )

  return (
    <Panel
      title="MedGen"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No MedGen concepts found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={safeConcepts}
          getSearchText={(c) =>
            [
              typeof c.name === 'string' ? c.name : String(c.name || ''),
              c.conceptId,
              typeof c.definition === 'string' ? c.definition : '',
              ...(Array.isArray(c.semanticTypes) ? c.semanticTypes : []),
              ...(Array.isArray(c.omimIds) ? c.omimIds : []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter concepts…"
          getKey={(concept, i) => `${concept.conceptId || i}-${i}`}
          renderItem={(concept) => <ConceptItem concept={concept} />}
        />
      )}
    </Panel>
  )
})
