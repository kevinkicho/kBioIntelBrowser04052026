'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PubMedArticle } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

function PubMedItem({ article }: { article: PubMedArticle }) {
  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 line-clamp-2"
        >
          {article.title}
        </a>
        <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700/30 px-1.5 py-0.5 rounded shrink-0">
          {article.pmid}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {(article.authors || []).slice(0, 3).join(', ')}
        {(article.authors?.length || 0) > 3 && ' et al.'}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">
        {[article.journal, article.pubDate, article.volume && `vol ${article.volume}`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {article.abstract && (
        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{article.abstract}</p>
      )}
      <div className="flex gap-2 mt-1 text-[10px]">
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            PubMed ↗
          </a>
        )}
        {article.doi && (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300"
          >
            DOI ↗
          </a>
        )}
        {article.pmcid && (
          <a
            href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PMC ↗
          </a>
        )}
      </div>
    </div>
  )
}

export const PubMedPanel = memo(function PubMedPanel({
  articles,
  panelId,
  lastFetched,
}: {
  articles: PubMedArticle[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(articles) ? articles : []
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<PubMedArticle>((a) => a.pubDate, {
        newest: 'Newest first',
        oldest: 'Oldest first',
      }),
      ...alphaSortOptions<PubMedArticle>((a) => a.title || ''),
      ...alphaSortOptions<PubMedArticle>((a) => a.journal || '').map((o) => ({
        ...o,
        id: `journal-${o.id}`,
        label: o.id.includes('asc') ? 'Journal A–Z' : 'Journal Z–A',
      })),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel title="PubMed" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No PubMed articles found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title={`PubMed (${list.length})`} panelId={panelId} lastFetched={lastFetched}>
      <FilterablePaginatedList
        items={list}
        getSearchText={(a) =>
          [
            a.title,
            ...(a.authors || []),
            a.journal,
            a.pmid,
            a.doi,
            a.pubDate,
            a.abstract,
            ...(a.keywords || []),
          ]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter articles (title, author, journal, PMID…)"
        getKey={(a, i) => `${a.pmid}-${i}`}
        renderItem={(article) => <PubMedItem article={article} />}
      />
    </Panel>
  )
})
