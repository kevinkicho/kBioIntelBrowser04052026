import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { NciConcept } from '@/lib/types'

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
  return (
    <Panel
      title={isEmpty ? 'NCI Thesaurus' : `NCI Thesaurus (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No NCI Thesaurus concepts found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-1">
          {list.map((concept, i) => (
            <div
              key={`${concept.code || concept.conceptId}-${i}`}
              className="py-2 border-b border-slate-700/60 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={concept.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-100 hover:text-cyan-300"
                    >
                      {concept.name}
                    </a>
                    <span className="text-[10px] font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
                      {concept.code || concept.conceptId}
                    </span>
                    {concept.conceptStatus && (
                      <span className="text-[10px] bg-slate-700/60 text-slate-400 border border-slate-600/40 px-1.5 py-0.5 rounded">
                        {concept.conceptStatus}
                      </span>
                    )}
                    {concept.leaf != null && (
                      <span className="text-[9px] text-slate-600">
                        {concept.leaf ? 'leaf' : 'branch'}
                      </span>
                    )}
                  </div>
                  {concept.semanticType && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{concept.semanticType}</p>
                  )}
                  {concept.definition && (
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {concept.definition}
                    </p>
                  )}
                  {concept.synonyms?.length > 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      Also: {concept.synonyms.slice(0, 4).join(', ')}
                      {concept.synonyms.length > 4 ? '…' : ''}
                    </p>
                  )}
                </div>
                {concept.url && (
                  <a
                    href={concept.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    NCI ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
