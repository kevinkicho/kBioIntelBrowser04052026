'use client'

import { useMemo } from 'react'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { ProteinVariation, ProteomicsMapping, CrossReference } from '@/lib/api/ebi-proteins-variation'
import {
  alphaSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

interface EbiProteinsPanelProps {
  variations?: ProteinVariation | null
  proteomics?: ProteomicsMapping | null
  crossReferences?: CrossReference | null
  panelId: string
  lastFetched?: Date
}

type VariationItem = NonNullable<ProteinVariation['variations']>[number]
type ProteomicsItem = NonNullable<ProteomicsMapping['proteomicsData']>[number]

function getSourceUrl(source: string, sourceId: string): string {
  switch (source.toLowerCase()) {
    case 'clinvar':
      return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${sourceId}`
    case 'gnomad':
      return `https://gnomad.broadinstitute.org/variant/${sourceId}`
    case 'cosmic':
      return `https://cancer.sanger.ac.uk/cosmic/mutation/overview?id=${sourceId}`
    case '1000genomes':
      return `https://www.internationalgenome.org/data-portal/variant/${sourceId}`
    default:
      return '#'
  }
}

export function EbiProteinsPanel({
  variations,
  proteomics,
  crossReferences,
  panelId,
  lastFetched,
}: EbiProteinsPanelProps) {
  const variationList = variations?.variations ?? []
  const proteomicsList = proteomics?.proteomicsData ?? []
  const xrList = crossReferences?.crossReferences ?? []
  const hasData = Boolean(variationList.length || proteomicsList.length || xrList.length)

  const variationSortOptions = useMemo(
    () => [
      ...alphaSortOptions<VariationItem>((v) => v.type || ''),
      ...alphaSortOptions<VariationItem>((v) => v.source || '').map((o) => ({
        ...o,
        id: `source-${o.id}`,
        label: o.id === 'name-asc' ? 'Source A–Z' : 'Source Z–A',
      })),
      ...numberSortOptions<VariationItem>((v) => v.frequency?.value ?? 0, {
        high: 'Highest frequency',
        low: 'Lowest frequency',
      }),
      ...numberSortOptions<VariationItem>((v) => v.location?.start ?? 0, {
        high: 'Position high',
        low: 'Position low',
        idPrefix: 'pos',
      }),
    ],
    [],
  )

  const proteomicsSortOptions = useMemo(
    () => [
      ...numberSortOptions<ProteomicsItem>((e) => e.coverage ?? 0, {
        high: 'Highest coverage',
        low: 'Lowest coverage',
        idPrefix: 'cov',
      }),
      ...numberSortOptions<ProteomicsItem>((e) => e.peptideCount ?? 0, {
        high: 'Most peptides',
        low: 'Fewest peptides',
      }),
      ...alphaSortOptions<ProteomicsItem>((e) => e.proteinId || ''),
    ],
    [],
  )

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="EMBL-EBI Proteins" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No variation, proteomics, or cross-reference data available.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title="EMBL-EBI Proteins" lastFetched={lastFetched}>
      <div className="space-y-6">
        {variationList.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Genetic Variations ({variationList.length})
            </h4>
            <FilterablePaginatedList
              items={variationList}
              getSearchText={(variation) =>
                [
                  variation.type,
                  variation.source,
                  variation.sourceId,
                  variation.clinicalSignificance,
                  variation.sequenceVariation?.type,
                  variation.sequenceVariation?.sequence,
                  String(variation.location?.start),
                  String(variation.location?.end),
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={variationSortOptions}
              defaultSortId="name-asc"
              filterPlaceholder="Filter variations…"
              getKey={(variation) => `${variation.source}-${variation.sourceId}`}
              pageSize={5}
              renderItem={(variation) => (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-blue-700">{variation.type}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200">{variation.source}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Position: {variation.location.start}–{variation.location.end}
                      </p>
                      {variation.sequenceVariation && (
                        <p className="text-xs text-gray-500 mb-1">
                          {variation.sequenceVariation.type}: {variation.sequenceVariation.sequence}
                        </p>
                      )}
                      {variation.clinicalSignificance && (
                        <p className="text-xs text-gray-500 mb-1">
                          Clinical: {variation.clinicalSignificance}
                        </p>
                      )}
                      {variation.frequency && (
                        <p className="text-xs text-gray-500">
                          Frequency: {(variation.frequency.value * 100).toFixed(2)}%
                          {variation.frequency.population && ` (${variation.frequency.population})`}
                        </p>
                      )}
                    </div>
                    <a
                      href={getSourceUrl(variation.source, variation.sourceId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View Source
                    </a>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {proteomicsList.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Proteomics Data ({proteomicsList.length})
            </h4>
            <FilterablePaginatedList
              items={proteomicsList}
              getSearchText={(entry) =>
                [
                  entry.proteinId,
                  String(entry.peptideCount),
                  String(entry.uniquePeptideCount),
                  String(entry.coverage),
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={proteomicsSortOptions}
              defaultSortId="cov-desc"
              filterPlaceholder="Filter proteomics…"
              getKey={(entry) => entry.proteinId}
              pageSize={5}
              renderItem={(entry) => (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-blue-700 mb-1">{entry.proteinId}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Peptides:</span>{' '}
                          <span className="font-medium">{entry.peptideCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Unique:</span>{' '}
                          <span className="font-medium">{entry.uniquePeptideCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Coverage:</span>{' '}
                          <span className="font-medium">{(entry.coverage * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      {entry.experiments?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.experiments.length} experiment(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {xrList.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Cross-References ({xrList.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {xrList.slice(0, 20).map((xr, idx) => (
                <a
                  key={idx}
                  href={xr.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                >
                  {xr.database}: {xr.id}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
