import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { KEGGPathway, KEGGCompound, KEGGDrug } from '@/lib/types'

function PathwayItem({ pathway }: { pathway: KEGGPathway }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={pathway.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          >
            {pathway.name}
          </a>
          <p className="text-xs text-slate-400 mt-0.5">{pathway.id}</p>
        </div>
        {pathway.class && (
          <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
            {pathway.class.split(';')[0]}
          </span>
        )}
      </div>
      {pathway.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pathway.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {pathway.compounds.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{pathway.compounds.length} compounds</span>
        )}
        {pathway.enzymes.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{pathway.enzymes.length} enzymes</span>
        )}
        {pathway.genes.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{pathway.genes.length} genes</span>
        )}
      </div>
      {pathway.imageUrl && (
        <a
          href={pathway.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
        >
          View Pathway Map →
        </a>
      )}
    </div>
  )
}

function CompoundItem({ compound }: { compound: KEGGCompound }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={compound.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          >
            {compound.name}
          </a>
          <p className="text-xs text-slate-400 mt-0.5">{compound.id}</p>
        </div>
        {compound.exactMass > 0 && (
          <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
            {compound.exactMass.toFixed(2)} Da
          </span>
        )}
      </div>
      {compound.formula && (
        <p className="text-xs text-slate-400 mt-1">Formula: {compound.formula}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {compound.pathways.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{compound.pathways.length} pathways</span>
        )}
        {compound.enzymes.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{compound.enzymes.length} enzymes</span>
        )}
      </div>
    </div>
  )
}

function DrugItem({ drug }: { drug: KEGGDrug }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={drug.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          >
            {drug.name}
          </a>
          <p className="text-xs text-slate-400 mt-0.5">{drug.id}</p>
        </div>
        {drug.ATC && (
          <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded shrink-0">
            {drug.ATC}
          </span>
        )}
      </div>
      {drug.formula && (
        <p className="text-xs text-slate-400 mt-1">Formula: {drug.formula}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {drug.pathways.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{drug.pathways.length} pathways</span>
        )}
        {drug.targets.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{drug.targets.length} targets</span>
        )}
      </div>
    </div>
  )
}

type KEGGData = {
  pathways: KEGGPathway[]
  compounds: KEGGCompound[]
  drugs: KEGGDrug[]
}

export const KEGGPanel = memo(function KEGGPanel({ data, panelId, lastFetched }: { data: KEGGData, panelId?: string, lastFetched?: Date }) {
  const { pathways, compounds, drugs } = data
  const isEmpty = pathways.length === 0 && compounds.length === 0 && drugs.length === 0

  return (
    <Panel
      title="KEGG"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No KEGG pathway, compound, or drug data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Kyoto Encyclopedia of Genes and Genomes
          </p>

          {pathways.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-purple-400">Pathways</span>
                <span className="text-xs text-slate-500">({pathways.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {pathways.map((pathway, i) => (
                  <PathwayItem key={`${pathway.id}-${i}`} pathway={pathway} />
                ))}
              </PaginatedList>
            </div>
          )}

          {compounds.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-cyan-400">Compounds</span>
                <span className="text-xs text-slate-500">({compounds.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {compounds.map((compound, i) => (
                  <CompoundItem key={`${compound.id}-${i}`} compound={compound} />
                ))}
              </PaginatedList>
            </div>
          )}

          {drugs.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-green-400">Drugs</span>
                <span className="text-xs text-slate-500">({drugs.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {drugs.map((drug, i) => (
                  <DrugItem key={`${drug.id}-${i}`} drug={drug} />
                ))}
              </PaginatedList>
            </div>
          )}
        </>
      )}
    </Panel>
  )
})