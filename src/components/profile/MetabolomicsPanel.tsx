import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MetaboliteData, MetabolomicsStudy } from '@/lib/types'

interface MetabolomicsPanelProps {
  data?: {
    metabolites?: MetaboliteData[]
    studies?: MetabolomicsStudy[]
  }
  panelId?: string
  lastFetched?: Date
}

function MetaboliteBadge({ label, value }: { label: string, value?: string | number }) {
  if (!value) return null
  return (
    <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded">
      {label}: {value}
    </span>
  )
}

export const MetabolomicsPanel = memo(function MetabolomicsPanel({ data, panelId, lastFetched }: MetabolomicsPanelProps) {
  const metabolites = data?.metabolites ?? []
  const studies = data?.studies ?? []

  if (metabolites.length === 0 && studies.length === 0) {
    return (
      <Panel title="Metabolomics Workbench" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No metabolomics data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Metabolomics Workbench" panelId={panelId} lastFetched={lastFetched} className="space-y-4">
      {metabolites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Metabolites ({metabolites.length})
          </h3>
          <PaginatedList className="space-y-3">
            {metabolites.map((met, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100 text-sm">{met.refmetName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{met.formula}</p>
                  </div>
                  <span className="text-xs font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                    {met.exactMass.toFixed(4)} Da
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {met.mainClass && <MetaboliteBadge label="Class" value={met.mainClass} />}
                  {met.subClass && <MetaboliteBadge label="Subclass" value={met.subClass} />}
                </div>

                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {met.hmdbId && (
                    <a
                      href={`https://hmdb.ca/metabolites/${met.hmdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      HMDB: {met.hmdbId}
                    </a>
                  )}
                  {met.pubchemCid && (
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${met.pubchemCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      PubChem: {met.pubchemCid}
                    </a>
                  )}
                  {met.keggId && (
                    <a
                      href={`https://www.genome.jp/entry/${met.keggId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      KEGG: {met.keggId}
                    </a>
                  )}
                  {met.chebiId && (
                    <a
                      href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${met.chebiId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      ChEBI: {met.chebiId}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </PaginatedList>
        </div>
      )}

      {studies.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Related Studies ({studies.length})
          </h3>
          <PaginatedList className="space-y-3">
            {studies.map((study, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <a
                  href={`https://www.metabolomicsworkbench.org/data/DRCCMetadata.php?Mode=ProcessDownloadResults&StudyID=${study.studyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-400 hover:text-blue-300 text-sm"
                >
                  {study.title}
                </a>
                {study.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{study.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{study.metabolites} metabolites</span>
                  <span>{study.samples} samples</span>
                  {study.doi && (
                    <a
                      href={`https://doi.org/${study.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      DOI: {study.doi}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </PaginatedList>
        </div>
      )}
    </Panel>
  )
})
