'use client'

import React from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { TTDTarget, TTDDrug } from '@/lib/types'

interface TTDPanelProps {
  targets?: TTDTarget[]
  drugs?: TTDDrug[]
  panelId: string
  lastFetched?: Date
}

function TargetItem({ target }: { target: TTDTarget }) {
  return (
    <div key={target.id} className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-blue-700 mb-1">{target.name}</h4>
          <p className="text-xs text-gray-500 mb-1">ID: {target.id}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
              {target.type}
            </span>
            <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
              {target.organism}
            </span>
          </div>
        </div>
        <a
          href={target.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
        >
          View Target
        </a>
      </div>

      {target.function && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{target.function}</p>
      )}

      {target.associatedDiseases?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">Associated Diseases:</p>
          <div className="flex flex-wrap gap-1">
            {target.associatedDiseases.slice(0, 5).map((disease, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded"
              >
                {disease}
              </span>
            ))}
            {target.associatedDiseases.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-gray-500">
                +{target.associatedDiseases.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {target.pathway?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">Pathways:</p>
          <div className="flex flex-wrap gap-1">
            {target.pathway.slice(0, 3).map((pathway, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {pathway}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Drugs: {target.drugCount}</span>
      </div>
    </div>
  )
}

function DrugItem({ drug }: { drug: TTDDrug }) {
  return (
    <div key={drug.id} className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-blue-700 mb-1">{drug.name}</h4>
          <p className="text-xs text-gray-500 mb-1">ID: {drug.id}</p>
          <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded mb-2">
            {drug.type}
          </span>
        </div>
        <a
          href={drug.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
        >
          View Drug
        </a>
      </div>

      {drug.indications?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">Indications:</p>
          <div className="flex flex-wrap gap-1">
            {drug.indications.slice(0, 5).map((indication, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {indication}
              </span>
            ))}
            {drug.indications.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-gray-500">
                +{drug.indications.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {drug.targets?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">Targets:</p>
          <div className="flex flex-wrap gap-1">
            {drug.targets.slice(0, 5).map((target, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
              >
                {target}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TTDPanel({
  targets,
  drugs,
  panelId,
  lastFetched,
}: TTDPanelProps) {
  const hasTargets = Boolean(targets?.length)
  const hasDrugs = Boolean(drugs?.length)
  const hasData = hasTargets || hasDrugs

  if (!hasData) {
    return (
      <Panel panelId={panelId} title="Therapeutic Target Database" lastFetched={lastFetched}>
        <p className="text-gray-500 text-sm">No TTD target or drug data available. TTD requires API access.</p>
      </Panel>
    )
  }

  return (
    <Panel panelId={panelId} title="Therapeutic Target Database" lastFetched={lastFetched}>
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          The Therapeutic Target Database (TTD) provides information about therapeutic targets and drugs.
        </p>

        {hasTargets && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Targets ({targets?.length ?? 0})</h4>
            <PaginatedList pageSize={5}>
              {(targets ?? []).map((target) => <TargetItem key={target.id} target={target} />)}
            </PaginatedList>
          </div>
        )}

        {hasDrugs && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Drugs ({drugs?.length ?? 0})</h4>
            <PaginatedList pageSize={5}>
              {(drugs ?? []).map((drug) => <DrugItem key={drug.id} drug={drug} />)}
            </PaginatedList>
          </div>
        )}
      </div>
    </Panel>
  )
}
