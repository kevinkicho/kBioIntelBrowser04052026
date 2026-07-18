import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DiseaseAssociation } from '@/lib/types'
import { DataPoint } from '@/components/ui/DataPoint'

function diseaseHref(disease: DiseaseAssociation): string {
  if (disease.diseaseId) {
    return `https://platform.opentargets.org/disease/${encodeURIComponent(disease.diseaseId)}`
  }
  return `https://platform.opentargets.org/search?q=${encodeURIComponent(disease.diseaseName)}&page=1`
}

export const OpenTargetsPanel = memo(function OpenTargetsPanel({
  diseases,
  panelId,
  lastFetched,
}: {
  diseases: DiseaseAssociation[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(diseases) ? diseases : []
  const isEmpty = list.length === 0
  return (
    <Panel
      title="Disease Associations (Open Targets)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No disease associations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-2">
          {list.map((disease, i) => {
            const otUrl = diseaseHref(disease)
            const localDisease = `/disease?q=${encodeURIComponent(disease.diseaseName)}`
            const discoverHref = `/discover?q=${encodeURIComponent(disease.diseaseName)}${
              disease.diseaseId ? `&diseaseId=${encodeURIComponent(disease.diseaseId)}` : ''
            }`
            return (
              <DataPoint
                key={`${disease.diseaseId || disease.diseaseName}-${i}`}
                sourceKey="opentargets"
                label={disease.diseaseName}
                recordUrl={otUrl}
                fetchedAt={lastFetched}
              >
                <div className="py-2.5 border-b border-slate-700 last:border-0 pr-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={otUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        {disease.diseaseName}
                      </a>
                      {disease.diseaseId && (
                        <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                          {disease.diseaseId}
                        </p>
                      )}
                      {disease.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {disease.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      {typeof disease.score === 'number' && disease.score > 0 && (
                        <span className="block text-xs tabular-nums text-emerald-300/90 bg-emerald-900/30 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                          {disease.score.toFixed(2)}
                        </span>
                      )}
                      {disease.evidenceCount > 0 && (
                        <span className="block text-[10px] text-slate-500">
                          {disease.evidenceCount} evidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                    {disease.therapeuticAreas?.slice(0, 6).map((area, j) => (
                      <span
                        key={j}
                        className="text-[10px] bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-1.5 py-0.5 rounded"
                      >
                        {area}
                      </span>
                    ))}
                    <Link
                      href={localDisease}
                      className="text-[10px] text-slate-500 hover:text-cyan-300 ml-auto"
                    >
                      BioIntel disease →
                    </Link>
                    <Link
                      href={discoverHref}
                      className="text-[10px] text-emerald-500/80 hover:text-emerald-300"
                    >
                      Discover →
                    </Link>
                    <a
                      href={otUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-slate-500 hover:text-indigo-300"
                    >
                      Open Targets ↗
                    </a>
                  </div>
                </div>
              </DataPoint>
            )
          })}
        </PaginatedList>
      )}
    </Panel>
  )
})
