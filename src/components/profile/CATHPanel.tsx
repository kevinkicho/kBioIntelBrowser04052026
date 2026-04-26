import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CATHDomain, Gene3DEntry } from '@/lib/types'

function DomainItem({ domain }: { domain: CATHDomain }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={domain.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          >
            {domain.domainId}
          </a>
          {domain.protein && (
            <p className="text-xs text-slate-400 mt-0.5">{domain.protein}</p>
          )}
        </div>
        {domain.pdbId && (
          <a
            href={`https://www.rcsb.org/structure/${domain.pdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded shrink-0 hover:bg-blue-800/50"
          >
            PDB: {domain.pdbId}
            {domain.pdbChain && `.${domain.pdbChain}`}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
        {domain.fold && (
          <span className="bg-purple-900/40 text-purple-300 border border-purple-700/30 px-1.5 py-0.5 rounded">
            {domain.fold}
          </span>
        )}
        {domain.superfamily && (
          <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
            {domain.superfamily}
          </span>
        )}
      </div>

      {domain.functionalFamily && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">FunFam:</span> {domain.functionalFamily}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {domain.organism && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{domain.organism}</span>
        )}
        {domain.length > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{domain.length} aa</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">Superfamily: {domain.superfamilyId}</span>
        <a
          href={domain.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          CATH Details →
        </a>
      </div>
    </div>
  )
}

function GeneItem({ entry }: { entry: Gene3DEntry }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm">{entry.geneSymbol}</h4>
          {entry.proteinName && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{entry.proteinName}</p>
          )}
        </div>
        <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded shrink-0">
          {entry.domains.length} domain{entry.domains.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {entry.organism && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{entry.organism}</span>
        )}
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{entry.geneId}</span>
      </div>

      {entry.domainArchitecture && (
        <p className="text-xs text-slate-500 mt-1">{entry.domainArchitecture}</p>
      )}

      {entry.domains.length > 0 && (
        <div className="mt-2 space-y-1">
          {entry.domains.slice(0, 3).map((domain, i) => (
            <div key={i} className="text-xs bg-slate-800/50 rounded p-1.5">
              <span className="text-slate-300">{domain.domainId}</span>
              {domain.superfamily && <span className="text-slate-400 ml-1">— {domain.superfamily}</span>}
            </div>
          ))}
          {entry.domains.length > 3 && (
            <p className="text-xs text-slate-400 pl-1">+{entry.domains.length - 3} more domains</p>
          )}
        </div>
      )}
    </div>
  )
}

type CATHData = {
  domains: CATHDomain[]
  gene3dEntries: Gene3DEntry[]
}

export const CATHPanel = memo(function CATHPanel({ data, panelId, lastFetched }: { data: CATHData, panelId?: string, lastFetched?: Date }) {
  const { domains, gene3dEntries } = data
  const isEmpty = domains.length === 0 && gene3dEntries.length === 0

  return (
    <Panel
      title="CATH/Gene3D"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No CATH domain classifications found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Protein Domain Classification Database
          </p>

          {domains.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-purple-400">Domains</span>
                <span className="text-xs text-slate-500">({domains.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {domains.map((domain, i) => (
                  <DomainItem key={`${domain.domainId}-${i}`} domain={domain} />
                ))}
              </PaginatedList>
            </div>
          )}

          {gene3dEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-green-400">Gene3D Entries</span>
                <span className="text-xs text-slate-500">({gene3dEntries.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {gene3dEntries.map((entry, i) => (
                  <GeneItem key={`${entry.geneId}-${i}`} entry={entry} />
                ))}
              </PaginatedList>
            </div>
          )}
        </>
      )}
    </Panel>
  )
})