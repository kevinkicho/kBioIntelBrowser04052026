import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MoleculeData } from '@/lib/types'

interface MyGenePanelProps {
  data: MoleculeData
  panelId?: string
  lastFetched?: Date
}

export const MyGenePanel = memo(function MyGenePanel({ data, panelId, lastFetched }: MyGenePanelProps) {
  const genes = data.myGeneAnnotations ?? []

  if (genes.length === 0) {
    return (
      <Panel title="MyGene" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No gene annotations found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="MyGene.info Annotations" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {genes.map((gene, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-slate-200">{gene.symbol}</h4>
                  {gene.entrezId && (
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/gene/${gene.entrezId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded hover:bg-blue-900/70"
                    >
                      Entrez: {gene.entrezId}
                    </a>
                  )}
                  {gene.ensemblId && (
                    <a
                      href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${gene.ensemblId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded hover:bg-green-900/70"
                    >
                      Ensembl
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{gene.name}</p>
                {gene.summary && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{gene.summary}</p>
                )}
              </div>
              <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded whitespace-nowrap">
                {gene.typeOfGene || 'gene'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
              {gene.mapLocation && (
                <div>
                  <span className="text-slate-500">Location:</span> {gene.mapLocation}
                </div>
              )}
              {gene.uniprotId && (
                <div>
                  <span className="text-slate-500">UniProt:</span>{' '}
                  <a
                    href={`https://www.uniprot.org/uniprotkb/${gene.uniprotId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {gene.uniprotId}
                  </a>
                </div>
              )}
            </div>

            {gene.pathways && gene.pathways.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Pathways: {gene.pathways.slice(0, 3).join(', ')}
                {gene.pathways.length > 3 && ` +${gene.pathways.length - 3} more`}
              </p>
            )}

            {gene.goAnnotations && (
              <div className="mt-1 space-y-0.5">
                {gene.goAnnotations.biologicalProcess.length > 0 && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">BP:</span>{' '}
                    {gene.goAnnotations.biologicalProcess.slice(0, 2).join(', ')}
                  </p>
                )}
                {gene.goAnnotations.molecularFunction.length > 0 && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">MF:</span>{' '}
                    {gene.goAnnotations.molecularFunction.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})