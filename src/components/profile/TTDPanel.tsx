'use client'

import { useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { TTDTarget, TTDDrug } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface TTDPanelProps {
  targets?: TTDTarget[]
  drugs?: TTDDrug[]
  panelId: string
  lastFetched?: Date
}

function TargetItem({ target }: { target: TTDTarget }) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
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
    <div className="p-4 border rounded-lg bg-gray-50">
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
  const targetList = Array.isArray(targets) ? targets : []
  const drugList = Array.isArray(drugs) ? drugs : []
  const hasTargets = targetList.length > 0
  const hasDrugs = drugList.length > 0
  const hasData = hasTargets || hasDrugs

  const targetSortOptions = useMemo(
    () => [
      ...alphaSortOptions<TTDTarget>((t) => t.name || ''),
      ...numberSortOptions<TTDTarget>((t) => t.drugCount || 0, {
        high: 'Most drugs',
        low: 'Fewest drugs',
      }),
    ],
    [],
  )

  const drugSortOptions = useMemo(
    () => [
      ...alphaSortOptions<TTDDrug>((d) => d.name || ''),
      ...alphaSortOptions<TTDDrug>((d) => d.type || '').map((o) => ({
        ...o,
        id: `type-${o.id}`,
        label: o.id.includes('asc') ? 'Type A–Z' : 'Type Z–A',
      })),
    ],
    [],
  )

  if (!hasData) {
    return (
      <Panel
        panelId={panelId}
        title="Therapeutic Target Database"
        lastFetched={lastFetched}
        empty="No TTD associations found for this query (BioThings TTD KP)."
      />
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
            <h4 className="font-semibold text-gray-800 mb-3">Targets ({targetList.length})</h4>
            <FilterablePaginatedList
              items={targetList}
              getSearchText={(target) =>
                [
                  target.name,
                  target.id,
                  target.type,
                  target.organism,
                  target.function,
                  ...(target.associatedDiseases || []),
                  ...(target.pathway || []),
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={targetSortOptions}
              defaultSortId="name-asc"
              filterPlaceholder="Filter targets (name, disease, pathway…)"
              getKey={(target) => target.id}
              pageSize={5}
              renderItem={(target) => <TargetItem target={target} />}
            />
          </div>
        )}

        {hasDrugs && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Drugs ({drugList.length})</h4>
            <FilterablePaginatedList
              items={drugList}
              getSearchText={(drug) =>
                [
                  drug.name,
                  drug.id,
                  drug.type,
                  ...(drug.indications || []),
                  ...(drug.targets || []),
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={drugSortOptions}
              defaultSortId="name-asc"
              filterPlaceholder="Filter drugs (name, indication, target…)"
              getKey={(drug) => drug.id}
              pageSize={5}
              renderItem={(drug) => <DrugItem drug={drug} />}
            />
          </div>
        )}
      </div>
    </Panel>
  )
}
