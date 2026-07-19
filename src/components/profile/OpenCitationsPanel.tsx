import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { CitationMetric } from '@/lib/types'
import { DataPoint } from '@/components/ui/DataPoint'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function shortDoi(doi: string): string {
  if (doi.length <= 36) return doi
  return `${doi.slice(0, 18)}…${doi.slice(-12)}`
}

function MetricRow({ metric }: { metric: CitationMetric }) {
  const openAlexUrl = metric.openAlexId
    ? `https://openalex.org/${metric.openAlexId}`
    : undefined
  const pubmedUrl = metric.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${metric.pmid}/`
    : undefined
  const ocMetaUrl = `https://opencitations.net/meta/br/?search=doi:${encodeURIComponent(metric.doi)}`

  const hasCiteSignal = metric.citationCount > 0
  const hasRefSignal = (metric.referenceCount ?? 0) > 0 || metric.references.length > 0
  const sparse = !metric.title && !hasCiteSignal && !hasRefSignal

  return (
    <DataPoint
      sourceKey="open-citations"
      label={metric.title || metric.doi}
      recordUrl={metric.url}
    >
      <div
        className={`py-3 border-b border-slate-700 last:border-0 ${sparse ? 'opacity-70' : ''}`}
      >
        {/* Title / fallback */}
        {metric.title ? (
          <a
            href={metric.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-100 hover:text-cyan-300 leading-snug"
          >
            {metric.title}
          </a>
        ) : (
          <p className="text-sm text-slate-400 italic">Title not in OpenCitations Meta</p>
        )}

        {/* Bibliographic line */}
        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
          {[metric.authors, metric.year, metric.venue].filter(Boolean).join(' · ') || (
            <span className="font-mono text-slate-600">{metric.doi}</span>
          )}
          {metric.type && (
            <span className="ml-1.5 text-[9px] uppercase tracking-wide text-slate-600">
              {metric.type}
            </span>
          )}
        </p>

        {/* Counts */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded border tabular-nums ${
              hasCiteSignal
                ? 'bg-cyan-900/40 text-cyan-200 border-cyan-700/40'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/50'
            }`}
            title="Times cited in OpenCitations index (not Google Scholar)"
          >
            Cited by <span className="font-semibold font-mono">{metric.citationCount}</span>
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded border tabular-nums ${
              hasRefSignal
                ? 'bg-indigo-900/30 text-indigo-200 border-indigo-700/40'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/50'
            }`}
            title="Outgoing references in OpenCitations"
          >
            Refs{' '}
            <span className="font-semibold font-mono">
              {metric.referenceCount ?? metric.references.length}
            </span>
          </span>
          {metric.volume && (
            <span className="text-[10px] text-slate-600">
              vol. {metric.volume}
              {metric.pages ? ` · p. ${metric.pages}` : ''}
            </span>
          )}
        </div>

        {!hasCiteSignal && (
          <p className="mt-1.5 text-[10px] text-slate-600 leading-relaxed">
            OpenCitations has no citing works indexed for this DOI yet — count is not a Google Scholar
            total.
          </p>
        )}

        {/* Sample cited-by / references DOIs */}
        {metric.citedBy.length > 0 && (
          <div className="mt-2">
            <p className="text-[9px] uppercase tracking-wide text-slate-600 mb-0.5">
              Recent citing DOIs
            </p>
            <div className="flex flex-wrap gap-1">
              {metric.citedBy.slice(0, 4).map((d) => (
                <a
                  key={d}
                  href={`https://doi.org/${d}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-cyan-500/80 hover:text-cyan-300 truncate max-w-[200px]"
                  title={d}
                >
                  {shortDoi(d)}
                </a>
              ))}
            </div>
          </div>
        )}
        {metric.references.length > 0 && metric.citedBy.length === 0 && (
          <div className="mt-2">
            <p className="text-[9px] uppercase tracking-wide text-slate-600 mb-0.5">
              Sample references
            </p>
            <div className="flex flex-wrap gap-1">
              {metric.references.slice(0, 4).map((d) => (
                <a
                  key={d}
                  href={`https://doi.org/${d}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-indigo-400/80 hover:text-indigo-300 truncate max-w-[200px]"
                  title={d}
                >
                  {shortDoi(d)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          <a
            href={metric.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300"
          >
            DOI ↗
          </a>
          <a
            href={ocMetaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300"
          >
            OpenCitations ↗
          </a>
          {openAlexUrl && (
            <a
              href={openAlexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500/80 hover:text-emerald-300"
            >
              OpenAlex ↗
            </a>
          )}
          {pubmedUrl && (
            <a
              href={pubmedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400/80 hover:text-violet-300"
            >
              PubMed ↗
            </a>
          )}
          <span className="font-mono text-slate-600 truncate max-w-[180px]" title={metric.doi}>
            {shortDoi(metric.doi)}
          </span>
        </div>
      </div>
    </DataPoint>
  )
}

export const OpenCitationsPanel = memo(function OpenCitationsPanel({
  metrics,
  panelId,
  lastFetched,
}: {
  metrics: CitationMetric[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = useMemo(
    () => (Array.isArray(metrics) ? metrics : []),
    [metrics],
  )
  const isEmpty = list.length === 0

  const summary = useMemo(() => {
    const withCites = list.filter((m) => m.citationCount > 0)
    const totalCites = list.reduce((s, m) => s + (m.citationCount || 0), 0)
    const withTitle = list.filter((m) => m.title).length
    return { withCites: withCites.length, totalCites, withTitle, n: list.length }
  }, [list])

  return (
    <Panel
      title={
        isEmpty
          ? 'Citation Metrics (OpenCitations)'
          : `Citation Metrics (OpenCitations) (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No DOIs available from literature to query OpenCitations for this molecule.'
          : undefined
      }
    >
      {!isEmpty && (
        <>
          <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Papers with OC cites:{' '}
              <span className="text-cyan-300 font-mono">{summary.withCites}</span> / {summary.n}
            </span>
            <span>
              Sum of OC citation counts:{' '}
              <span className="text-cyan-300 font-mono">{summary.totalCites}</span>
            </span>
            <span>
              With titles:{' '}
              <span className="text-slate-300 font-mono">{summary.withTitle}</span>
            </span>
            <span className="text-[10px] text-slate-600 w-full mt-0.5">
              Counts are OpenCitations-index only (open citation graph), not Google Scholar / Web of
              Science.
            </span>
          </div>
          <FilterablePaginatedList
            items={list}
            getSearchText={(m) =>
              [
                m.title,
                m.doi,
                m.authors,
                m.venue,
                m.year,
                m.type,
                String(m.citationCount),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={[
              ...numberSortOptions<CitationMetric>((m) => m.citationCount, {
                high: 'Most cited (OC)',
                low: 'Least cited (OC)',
              }),
              ...dateSortOptions<CitationMetric>((m) => m.year, {
                newest: 'Newest year',
                oldest: 'Oldest year',
              }),
              ...alphaSortOptions<CitationMetric>((m) => m.title || m.doi),
              ...numberSortOptions<CitationMetric>((m) => m.referenceCount ?? 0, {
                high: 'Most references',
                low: 'Fewest references',
              }).map((o) => ({ ...o, id: `ref-${o.id}` })),
            ]}
            defaultSortId="num-desc"
            filterPlaceholder="Filter papers (title, author, DOI, venue…)"
            getKey={(m, i) => `${m.doi}-${i}`}
            pageSize={5}
            renderItem={(metric) => <MetricRow metric={metric} />}
          />
        </>
      )}
    </Panel>
  )
})
