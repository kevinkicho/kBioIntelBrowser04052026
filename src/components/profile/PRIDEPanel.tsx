import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PRIDEProject } from '@/lib/types'

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
        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{project.description}</p>
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
  if (projects.length === 0) {
    return (
      <Panel title="PRIDE" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No PRIDE proteomics projects found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="PRIDE" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">Proteomics data from PRIDE Archive</p>
      <PaginatedList className="space-y-3">
        {projects.map((project, i) => (
          <ProjectItem key={`${project.accession}-${i}`} project={project} />
        ))}
      </PaginatedList>
    </Panel>
  )
})