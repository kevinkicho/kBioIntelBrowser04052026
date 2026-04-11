import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ChemSpiderCompound } from '@/lib/types'

function CompoundItem({ compound }: { compound: ChemSpiderCompound }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={compound.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
          >
            {compound.name}
          </a>
          <p className="text-xs text-slate-400 mt-0.5">CSID: {compound.csId}</p>
        </div>
        {compound.molecularWeight > 0 && (
          <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
            {compound.molecularWeight.toFixed(2)} Da
          </span>
        )}
      </div>

      {compound.formula && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">Formula:</span> {compound.formula}
        </p>
      )}

      {compound.inChIKey && (
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="text-slate-500">InChIKey:</span> <span className="font-mono">{compound.inChIKey}</span>
        </p>
      )}

      {(compound.synonyms?.length ?? 0) > 0 && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
          <span className="text-slate-400">Synonyms:</span> {(compound.synonyms ?? []).slice(0, 3).join(', ')}
          {(compound.synonyms?.length ?? 0) > 3 && ` +${compound.synonyms.length - 3} more`}
        </p>
      )}

      {(compound.sources?.length ?? 0) > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Sources:</span> {(compound.sources ?? []).slice(0, 3).join(', ')}
        </p>
      )}

      <div className="flex gap-2 mt-2">
        {compound.image2D && (
          <a
            href={compound.image2D}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            2D Structure
          </a>
        )}
        {compound.image3D && (
          <>
            <span className="text-slate-600">•</span>
            <a
              href={compound.image3D}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              3D Structure
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export const ChemSpiderPanel = memo(function ChemSpiderPanel({ compounds, panelId, lastFetched }: { compounds: ChemSpiderCompound[], panelId?: string, lastFetched?: Date }) {
  if (compounds.length === 0) {
    return (
      <Panel title="ChemSpider" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No ChemSpider compounds found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="ChemSpider" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">
        Royal Society of Chemistry Database — {compounds.length} compound{compounds.length !== 1 ? 's' : ''}
      </p>
      <PaginatedList className="space-y-2">
        {compounds.map((compound, i) => (
          <CompoundItem key={`${compound.csId}-${i}`} compound={compound} />
        ))}
      </PaginatedList>
    </Panel>
  )
})