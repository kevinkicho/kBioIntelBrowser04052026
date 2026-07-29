'use client'

import React, { useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { ExpandableMoreToggle } from '@/components/ui/ExpandableItems'
import type { ProteinAtlasData } from '@/lib/types'

interface HumanProteinAtlasPanelProps {
  data?: ProteinAtlasData | null
  panelId: string
  lastFetched?: Date
}

export function HumanProteinAtlasPanel({
  data,
  panelId,
  lastFetched,
}: HumanProteinAtlasPanelProps) {
  const hasData = Boolean(data?.tissueExpression?.length)

  const getExpressionColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="Human Protein Atlas" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No protein expression data available from Human Protein Atlas.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title="Human Protein Atlas" lastFetched={lastFetched}>
      <div className="space-y-6">
        {data?.description && (
          <p className="text-sm text-gray-600">{data.description}</p>
        )}

        {/* Tissue Expression */}
        {data?.tissueExpression && data.tissueExpression.length > 0 && (
          <TissueExpressionSection
            items={data.tissueExpression}
            getExpressionColor={getExpressionColor}
          />
        )}

        {/* Cell Line Expression */}
        {data?.cellLineExpression && data.cellLineExpression.length > 0 && (
          <CellLineExpressionSection
            items={data.cellLineExpression}
            getExpressionColor={getExpressionColor}
          />
        )}

        {/* Subcellular Localization */}
        {data?.subcellularLocalization && data.subcellularLocalization.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Subcellular Localization</h4>
            <div className="flex flex-wrap gap-2">
              {data.subcellularLocalization.map((loc, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 rounded-full"
                >
                  {loc.location}
                  {loc.confidence !== 'Uncertain' && (
                    <span className="ml-1 text-xs opacity-75">({loc.confidence})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* External Link */}
        {data?.gene && (
          <div className="pt-4 border-t">
            <a
              href={`https://www.proteinatlas.org/search/${encodeURIComponent(data.gene)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View full profile in Human Protein Atlas →
            </a>
          </div>
        )}
      </div>
    </Panel>
  )
}

function TissueExpressionSection({
  items,
  getExpressionColor,
}: {
  items: NonNullable<ProteinAtlasData['tissueExpression']>
  getExpressionColor: (level: string) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const limit = 12
  const visible = expanded ? items : items.slice(0, limit)
  const remaining = items.length - limit

  return (
    <div>
      <h4 className="font-semibold text-gray-800 mb-3">Tissue Expression</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {visible.map((tissue, idx) => (
          <div
            key={idx}
            className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <p className="font-medium text-sm text-gray-800 mb-1">{tissue.tissue}</p>
            <p className="text-xs text-gray-500 mb-1">{tissue.tissueType}</p>
            <span className={`inline-block px-2 py-0.5 text-xs rounded ${getExpressionColor(tissue.expressionLevel)}`}>
              {tissue.expressionLevel}
            </span>
            <p className="text-xs text-gray-500 mt-1">Score: {tissue.score}</p>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-2">
          <ExpandableMoreToggle
            remaining={remaining}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            unit="tissues"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer bg-transparent border-0 p-0"
            testId="hpa-tissues-more"
          />
        </div>
      )}
    </div>
  )
}

function CellLineExpressionSection({
  items,
  getExpressionColor,
}: {
  items: NonNullable<ProteinAtlasData['cellLineExpression']>
  getExpressionColor: (level: string) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const limit = 9
  const visible = expanded ? items : items.slice(0, limit)
  const remaining = items.length - limit

  return (
    <div>
      <h4 className="font-semibold text-gray-800 mb-3">Cell Line Expression</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {visible.map((cellLine, idx) => (
          <div key={idx} className="p-3 border rounded-lg bg-gray-50">
            <p className="font-medium text-sm text-gray-800 mb-1">{cellLine.cellLine}</p>
            <span className={`inline-block px-2 py-0.5 text-xs rounded ${getExpressionColor(cellLine.expressionLevel)}`}>
              {cellLine.expressionLevel}
            </span>
            <p className="text-xs text-gray-500 mt-1">Score: {cellLine.score}</p>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-2">
          <ExpandableMoreToggle
            remaining={remaining}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            unit="cell lines"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer bg-transparent border-0 p-0"
            testId="hpa-cell-lines-more"
          />
        </div>
      )}
    </div>
  )
}
