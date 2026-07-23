'use client'

import { memo, useMemo } from 'react'
import { DescriptionTip } from '@/components/ui/HelperTip'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PRIDEProject } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

function ProjectItem({ project }: { project: PRIDEProject }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {project.title}
        </a>
        <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded shrink-0">
          {project.accession}
        </span>
      </div>
      {project.species && (
        <p className="text-xs text-slate-500 mt-1">{project.species}</p>
      )}
      {project.description && (
        <DescriptionTip text={project.description} className="mt-2" />
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {project.numProteins > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{project.numProteins} proteins</span>
        )}
        {project.numPeptides > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{project.numPeptides} peptides</span>
        )}
        {project.numSpectra > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{project.numSpectra} spectra</span>
        )}
      </div>
      {project.instrument && (
        <p className="text-xs text-slate-500 mt-2">Instrument: {project.instrument}</p>
      )}
    </div>
  )
}

export const PRIDEPanel = memo(function PRIDEPanel({ projects, panelId, lastFetched }: { projects: PRIDEProject[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(projects) ? projects : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<PRIDEProject>((p) => p.title || ''),
      ...numberSortOptions<PRIDEProject>((p) => p.numProteins || 0, {
        high: 'Most proteins',
        low: 'Fewest proteins',
        idPrefix: 'proteins',
      }),
      ...numberSortOptions<PRIDEProject>((p) => p.numPeptides || 0, {
        high: 'Most peptides',
        low: 'Fewest peptides',
        idPrefix: 'peptides',
      }),
    ],
    [],
  )

  return (
    <Panel
      title="PRIDE"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No PRIDE proteomics projects found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Proteomics data from PRIDE Archive</p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(project) =>
              [
                project.title,
                project.accession,
                project.species,
                project.description,
                project.instrument,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter projects (title, accession, species…)"
            getKey={(project, i) => `${project.accession}-${i}`}
            renderItem={(project) => <ProjectItem project={project} />}
          />
        </>
      )}
    </Panel>
  )
})
