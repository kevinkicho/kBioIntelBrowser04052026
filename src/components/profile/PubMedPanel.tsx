import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { PubMedArticle } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

function PubMedItem({ article }: { article: PubMedArticle }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {article.title}
        </a>
        <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded shrink-0">
          PMID: {article.pmid}
        </span>
      </div>
      <p className="text-sm text-slate-400 mt-1">
        {article.authors.slice(0, 3).join(', ')}
        {article.authors.length > 3 && ` et al.`}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {article.journal}
        {article.pubDate && ` • ${article.pubDate}`}
        {article.volume && `; ${article.volume}`}
        {article.issue && `(${article.issue})`}
        {article.pages && `:${article.pages}`}
      </p>
      {article.abstract && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{article.abstract}</p>
      )}
      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {article.keywords.slice(0, 5).map((keyword, i) => (
            <span
              key={`${keyword}-${i}`}
              className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-3 mt-2 text-xs">
        {article.pmcid && (
          <a
            href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Full Text (PMC)
          </a>
        )}
        {article.doi && (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300"
          >
            DOI
          </a>
        )}
      </div>
    </div>
  )
}

export const PubMedPanel = memo(function PubMedPanel({ articles, panelId, lastFetched }: { articles: PubMedArticle[], panelId?: string, lastFetched?: Date }) {
  if (articles.length === 0) {
    return (
      <Panel title="PubMed" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No PubMed articles found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (articles.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="PubMed" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={articles}
          renderItem={(article, i) => <PubMedItem key={`${article.pmid}-${i}`} article={article} />}
          initialCount={10}
          estimateSize={160}
          emptyMessage="No PubMed articles found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="PubMed" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {articles.map((article, i) => (
          <PubMedItem key={`${article.pmid}-${i}`} article={article} />
        ))}
      </PaginatedList>
    </Panel>
  )
})