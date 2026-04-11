'use client'

import React, { useMemo } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { Panel } from '@/components/ui/Panel'
import type { LINCSSignature } from '@/lib/api/lincs'

interface LINCSPanelProps {
  signatures?: LINCSSignature[]
  panelId: string
  lastFetched?: Date
}

export function LINCSPanel({
  signatures,
  panelId,
  lastFetched,
}: LINCSPanelProps) {
  const hasData = Boolean(signatures?.length)

  const renderSignatureCard = useMemo(() => {
    // eslint-disable-next-line react/display-name
    return (signature: LINCSSignature) => (
      <div key={`${signature.perturbationId}-${signature.cellLine}-${signature.timePoint}`} className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-blue-700 mb-1">{signature.perturbationName}</h4>
            <p className="text-xs text-gray-500 mb-1">ID: {signature.perturbationId}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                {signature.perturbationType}
              </span>
              <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                {signature.concentration} {signature.concentrationUnit}
              </span>
              <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                {signature.timePoint}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div>
            <span className="text-gray-500">Cell Line:</span>{' '}
            <span className="font-medium">{signature.cellLineName || signature.cellLine}</span>
          </div>
          {signature.tissue && (
            <div>
              <span className="text-gray-500">Tissue:</span>{' '}
              <span className="font-medium">{signature.tissue}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm mb-3">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Z-Score:</span>
            <span className={`font-medium ${signature.zScore >= 2 ? 'text-red-600' : signature.zScore <= -2 ? 'text-green-600' : 'text-gray-700'}`}>
              {signature.zScore.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">P-Value:</span>
            <span className="font-medium">{signature.pValue.toExponential(2)}</span>
          </div>
        </div>

        {signature.upregulatedGenes?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">
              Upregulated ({signature.upregulatedGenes.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {signature.upregulatedGenes.slice(0, 10).map((gene, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded"
                >
                  {gene}
                </span>
              ))}
              {signature.upregulatedGenes.length > 10 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{signature.upregulatedGenes.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {signature.downregulatedGenes?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Downregulated ({signature.downregulatedGenes.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {signature.downregulatedGenes.slice(0, 10).map((gene, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded"
                >
                  {gene}
                </span>
              ))}
              {signature.downregulatedGenes.length > 10 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{signature.downregulatedGenes.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }, [])

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="LINCS L1000" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No LINCS L1000 gene expression signatures available.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title={`LINCS L1000 (${signatures?.length})`} lastFetched={lastFetched}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Gene expression signatures from the Library of Integrated Network-based Cellular Signatures (LINCS) L1000 project.
          Shows how cells respond to chemical perturbations at different concentrations and time points.
        </p>
        <PaginatedList pageSize={5}>
          {(signatures ?? []).map(renderSignatureCard)}
        </PaginatedList>
      </div>
    </Panel>
  )
}
