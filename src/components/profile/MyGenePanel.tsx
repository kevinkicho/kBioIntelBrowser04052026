'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { MyGeneAnnotation } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

interface MyGenePanelProps {
  genes?: MyGeneAnnotation[]
  panelId?: string
  lastFetched?: Date
}

export const MyGenePanel = memo(function MyGenePanel({ genes, panelId, lastFetched }: MyGenePanelProps) {
  const list = Array.isArray(genes) ? genes : []
  const isEmpty = list.length === 0
  const title = isEmpty ? 'MyGene' : 'MyGene.info Annotations'

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<MyGeneAnnotation>((g) => g.symbol || g.name || ''),
      ...alphaSortOptions<MyGeneAnnotation>((g) => g.name || '').map((o) => ({
        ...o,
        id: `fullname-${o.id}`,
        label: o.id.includes('asc') ? 'Full name A–Z' : 'Full name Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No gene annotations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(gene) =>
            [
              gene.symbol,
              gene.name,
              gene.geneId,
              gene.ensemblId,
              gene.uniprotId,
              gene.summary,
              gene.mapLocation,
              gene.typeOfGene,
              ...(gene.pathways || []),
              ...(gene.goAnnotations?.biologicalProcess || []),
              ...(gene.goAnnotations?.molecularFunction || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter genes (symbol, name, ID…)"
          getKey={(gene, idx) => `${gene.geneId || gene.symbol || idx}`}
          renderItem={(gene) => (
            <div className="py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-200">
                      {gene.geneId ? (
                        <Link href={`/gene/${gene.geneId}-${gene.symbol}`} className="text-indigo-300 hover:text-indigo-200 hover:underline">{gene.symbol}</Link>
                      ) : (
                        <Link href={`/gene?q=${encodeURIComponent(gene.symbol)}`} className="text-indigo-300 hover:text-indigo-200 hover:underline">{gene.symbol}</Link>
                      )}
                    </h4>
                    {gene.geneId && (
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/gene/${gene.geneId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded hover:bg-blue-900/70"
                      >
                        Entrez: {gene.geneId}
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
          )}
        />
      )}
    </Panel>
  )
})
