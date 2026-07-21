'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { GoAnnotation } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

function goAspectBadge(aspect: string): string {
  const normalizedAspect = aspect?.toLowerCase() || ''
  if (normalizedAspect.includes('biological') || normalizedAspect.includes('process')) {
    return 'bg-green-900/40 text-green-300 border-green-700/30'
  }
  if (normalizedAspect.includes('molecular') || normalizedAspect.includes('function')) {
    return 'bg-blue-900/40 text-blue-300 border-blue-700/30'
  }
  if (normalizedAspect.includes('cellular') || normalizedAspect.includes('component')) {
    return 'bg-purple-900/40 text-purple-300 border-purple-700/30'
  }
  return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

function normalizeAspect(aspect: string): string {
  if (!aspect) return ''
  return aspect.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function shortAspect(aspect: string): string {
  const n = aspect?.toLowerCase() || ''
  if (n.includes('biological') || n.includes('process')) return 'BP'
  if (n.includes('molecular') || n.includes('function')) return 'MF'
  if (n.includes('cellular') || n.includes('component')) return 'CC'
  return normalizeAspect(aspect).slice(0, 12) || 'GO'
}

export const GeneOntologyPanel = memo(function GeneOntologyPanel({
  terms,
  panelId,
  lastFetched,
}: {
  terms: GoAnnotation[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(terms) ? terms : []
  const isEmpty = list.length === 0
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<GoAnnotation>((t) => t.goName || ''),
      ...alphaSortOptions<GoAnnotation>((t) => t.goId || '').map((o) => ({
        ...o,
        id: `goid-${o.id}`,
        label: o.id === 'name-asc' ? 'GO ID A–Z' : 'GO ID Z–A',
      })),
      ...alphaSortOptions<GoAnnotation>((t) => t.goAspect || '').map((o) => ({
        ...o,
        id: `aspect-${o.id}`,
        label: o.id === 'name-asc' ? 'Aspect A–Z' : 'Aspect Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'Gene Ontology Terms' : `Gene Ontology Terms (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Gene Ontology terms found.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(term) =>
            [term.goName, term.goId, term.goAspect, term.qualifier, term.evidence]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter GO terms…"
          getKey={(term, i) => `${term.goId || i}-${i}`}
          pageSize={5}
          className="space-y-1"
          renderItem={(term) => {
            const href = term.url || `https://amigo.geneontology.org/amigo/term/${term.goId}`
            return (
              <div className="py-2 border-b border-slate-700/60 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StyledTooltip content={normalizeAspect(term.goAspect)}>
                        <span
                          className={`text-[10px] border px-1.5 py-0.5 rounded shrink-0 ${goAspectBadge(term.goAspect)}`}
                        >
                          {shortAspect(term.goAspect)}
                        </span>
                      </StyledTooltip>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-100 hover:text-blue-300"
                      >
                        {term.goName}
                      </a>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-blue-400/80 hover:text-blue-300"
                      >
                        {term.goId}
                      </a>
                    </div>
                    {(term.qualifier || term.evidence) && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[
                          term.qualifier && `Qualifier: ${term.qualifier}`,
                          term.evidence && `Evidence: ${term.evidence}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    AmiGO ↗
                  </a>
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
