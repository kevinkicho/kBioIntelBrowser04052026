'use client'

import { memo, useMemo } from 'react'
import { DescriptionTip } from '@/components/ui/HelperTip'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { ExpandableTextList } from '@/components/ui/ExpandableItems'
import type { SMPDBPathway } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

function PathwayItem({ pathway }: { pathway: SMPDBPathway }) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Metabolic': 'bg-blue-900/40 text-blue-300 border-blue-700/30',
      'Signaling': 'bg-purple-900/40 text-purple-300 border-purple-700/30',
      'Drug': 'bg-green-900/40 text-green-300 border-green-700/30',
      'Disease': 'bg-red-900/40 text-red-300 border-red-700/30',
    }
    return colors[type] || 'bg-slate-700/50 text-slate-300'
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={pathway.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {pathway.name}
        </a>
        <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${getTypeColor(pathway.pathwayType)}`}>
          {pathway.pathwayType}
        </span>
      </div>
      {pathway.description && (
        <DescriptionTip text={pathway.description} className="mt-2" />
      )}
      <p className="text-xs text-slate-500 mt-1">
        Organism: {pathway.organism}
      </p>
      {pathway.metabolites.length > 0 && (
        <ExpandableTextList
          items={pathway.metabolites}
          maxVisible={3}
          prefix="Metabolites:"
          className="text-xs text-slate-500 mt-1"
          testId="smpdb-metabolites"
        />
      )}
      {pathway.enzymes.length > 0 && (
        <ExpandableTextList
          items={pathway.enzymes}
          maxVisible={2}
          prefix="Enzymes:"
          className="text-xs text-slate-500 mt-1"
          testId="smpdb-enzymes"
        />
      )}
    </div>
  )
}

export const SMPDBPanel = memo(function SMPDBPanel({ pathways, panelId, lastFetched }: { pathways: SMPDBPathway[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(pathways) ? pathways : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<SMPDBPathway>((p) => p.name || ''),
      ...alphaSortOptions<SMPDBPathway>((p) => p.pathwayType || '').map((o) => ({
        ...o,
        id: `type-${o.id}`,
        label: o.id.includes('asc') ? 'Type A–Z' : 'Type Z–A',
      })),
      ...alphaSortOptions<SMPDBPathway>((p) => p.organism || '').map((o) => ({
        ...o,
        id: `org-${o.id}`,
        label: o.id.includes('asc') ? 'Organism A–Z' : 'Organism Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="SMPDB"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No SMPDB pathways found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Small molecule pathways from SMPDB</p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(pathway) =>
              [
                pathway.name,
                pathway.pathwayType,
                pathway.organism,
                pathway.description,
                pathway.smpdbId,
                ...(pathway.metabolites || []),
                ...(pathway.enzymes || []),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter pathways (name, type, metabolite…)"
            getKey={(pathway, i) => `${pathway.smpdbId}-${i}`}
            renderItem={(pathway) => <PathwayItem pathway={pathway} />}
          />
        </>
      )}
    </Panel>
  )
})
