'use client'

import React, { useMemo } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { ProteinVariation, ProteomicsMapping, CrossReference } from '@/lib/api/ebi-proteins-variation'

interface EbiProteinsPanelProps {
  variations?: ProteinVariation | null
  proteomics?: ProteomicsMapping | null
  crossReferences?: CrossReference | null
  panelId: string
  lastFetched?: Date
}

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
  const hasData = Boolean(variations?.variations?.length || proteomics?.proteomicsData?.length || crossReferences?.crossReferences?.length)

  const sections = useMemo(() => {
    const result: { title: string; content: React.ReactNode }[] = []

    if (variations?.variations?.length) {
      result.push({
        title: `Genetic Variations (${variations.variations.length})`,
        content: (
          <PaginatedList pageSize={5}>
            {(variations.variations ?? []).map((variation) => (
              <div key={`${variation.source}-${variation.sourceId}`} className="p-3 border rounded-lg bg-gray-50">
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
            ))}
          </PaginatedList>
        ),
      })
    }

    if (proteomics?.proteomicsData?.length) {
      result.push({
        title: `Proteomics Data (${proteomics.proteomicsData.length})`,
        content: (
          <PaginatedList pageSize={5}>
            {(proteomics.proteomicsData ?? []).map((entry) => (
              <div key={entry.proteinId} className="p-3 border rounded-lg bg-gray-50">
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
            ))}
          </PaginatedList>
        ),
      })
    }

    if (crossReferences?.crossReferences?.length) {
      result.push({
        title: `Cross-References (${crossReferences.crossReferences.length})`,
        content: (
          <div className="flex flex-wrap gap-2">
            {crossReferences.crossReferences.slice(0, 20).map((xr, idx) => (
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
        ),
      })
    }

    return result
  }, [variations, proteomics, crossReferences])

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
        {sections.map((section, idx) => (
          <div key={idx}>
            <h4 className="font-semibold text-gray-800 mb-3">{section.title}</h4>
            {section.content}
          </div>
        ))}
      </div>
    </Panel>
  )
}
