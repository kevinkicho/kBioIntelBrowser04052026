import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MetaboLightsStudy, MetaboLightsMetabolite } from '@/lib/types'

function StudyItem({ study }: { study: MetaboLightsStudy }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded shrink-0 font-mono">
          {study.id}
        </span>
        <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded shrink-0">
          {study.studyType}
        </span>
      </div>
      <h4 className="font-semibold text-slate-100 text-sm mt-2 line-clamp-2">{study.title}</h4>
      {study.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{study.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {study.organism && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{study.organism}</span>
        )}
        {study.organismPart && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{study.organismPart}</span>
        )}
        {study.platform && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{study.platform}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-xs">
        {study.metabolites > 0 && (
          <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
            {study.metabolites} metabolites
          </span>
        )}
        {study.samples > 0 && (
          <span className="bg-purple-900/40 text-purple-300 border border-purple-700/30 px-1.5 py-0.5 rounded">
            {study.samples} samples
          </span>
        )}
      </div>
      {study.techniques.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Techniques:</span> {study.techniques.slice(0, 3).join(', ')}
          {study.techniques.length > 3 && ` +${study.techniques.length - 3} more`}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">{study.publicationDate}</span>
        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          View Study →
        </a>
      </div>
    </div>
  )
}

function MetaboliteItem({ metabolite }: { metabolite: MetaboLightsMetabolite }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm truncate">{metabolite.name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{metabolite.id}</p>
        </div>
        {metabolite.mass > 0 && (
          <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
            {metabolite.mass.toFixed(4)} Da
          </span>
        )}
      </div>
      {metabolite.formula && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">Formula:</span> {metabolite.formula}
        </p>
      )}
      {metabolite.inchiKey && (
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="text-slate-500">InChIKey:</span> <span className="font-mono text-xs">{metabolite.inchiKey}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {metabolite.chebiId && (
          <a
            href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${metabolite.chebiId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-orange-900/40 text-orange-300 border border-orange-700/30 px-1.5 py-0.5 rounded hover:bg-orange-800/50"
          >
            {metabolite.chebiId}
          </a>
        )}
        {metabolite.hmdbId && (
          <a
            href={`https://hmdb.ca/metabolites/${metabolite.hmdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-1.5 py-0.5 rounded hover:bg-blue-800/50"
          >
            {metabolite.hmdbId}
          </a>
        )}
      </div>
      {metabolite.databaseLinks.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Cross-references:</span> {metabolite.databaseLinks.slice(0, 3).map(dl => dl.database).join(', ')}
        </p>
      )}
      <a
        href={metabolite.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
      >
        View Metabolite →
      </a>
    </div>
  )
}

type MetaboLightsData = {
  studies: MetaboLightsStudy[]
  metabolites: MetaboLightsMetabolite[]
}

export const MetaboLightsPanel = memo(function MetaboLightsPanel({ data, panelId, lastFetched }: { data: MetaboLightsData, panelId?: string, lastFetched?: Date }) {
  const { studies, metabolites } = data
  const isEmpty = studies.length === 0 && metabolites.length === 0

  return (
    <Panel
      title="MetaboLights"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No metabolomics data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Metabolomics Repository
          </p>

          {studies.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-green-400">Studies</span>
                <span className="text-xs text-slate-500">({studies.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {studies.map((study, i) => (
                  <StudyItem key={`${study.id}-${i}`} study={study} />
                ))}
              </PaginatedList>
            </div>
          )}

          {metabolites.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-cyan-400">Metabolites</span>
                <span className="text-xs text-slate-500">({metabolites.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {metabolites.map((metabolite, i) => (
                  <MetaboliteItem key={`${metabolite.id}-${i}`} metabolite={metabolite} />
                ))}
              </PaginatedList>
            </div>
          )}
        </>
      )}
    </Panel>
  )
})