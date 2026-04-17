import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { buildTherapeuticLandscape, type TherapeuticLandscape, type LandscapeDisease } from '@/lib/therapeuticLandscape'
import type { ChemblIndication, DiseaseAssociation, DisGeNetAssociation, OrphanetDisease, CTDDiseaseAssociation } from '@/lib/types'

interface TherapeuticLandscapePanelProps {
  chemblIndications?: ChemblIndication[] | null
  openTargetsDiseases?: DiseaseAssociation[] | null
  disgenetAssociations?: DisGeNetAssociation[] | null
  orphanetDiseases?: OrphanetDisease[] | null
  ctdDiseaseAssociations?: CTDDiseaseAssociation[] | null
  panelId?: string
  lastFetched?: Date
}

export const TherapeuticLandscapePanel = memo(function TherapeuticLandscapePanel({
  chemblIndications,
  openTargetsDiseases,
  disgenetAssociations,
  orphanetDiseases,
  ctdDiseaseAssociations,
  panelId,
  lastFetched,
}: TherapeuticLandscapePanelProps) {
  const landscape: TherapeuticLandscape = useMemo(
    () => buildTherapeuticLandscape(
      chemblIndications ?? null,
      openTargetsDiseases ?? null,
      disgenetAssociations ?? null,
      orphanetDiseases ?? null,
      ctdDiseaseAssociations ?? null,
    ),
    [chemblIndications, openTargetsDiseases, disgenetAssociations, orphanetDiseases, ctdDiseaseAssociations],
  )

  if (landscape.totalDiseases === 0) {
    return (
      <Panel title="Therapeutic Landscape" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No disease associations found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Therapeutic Landscape" panelId={panelId} lastFetched={lastFetched}>
      <div className="space-y-5">
        {landscape.approved.length > 0 && (
          <DiseaseGroup
            title="Approved Indications"
            count={landscape.approved.length}
            diseases={landscape.approved}
            accent="emerald"
            icon="check"
          />
        )}
        {landscape.investigational.length > 0 && (
          <DiseaseGroup
            title="Investigational"
            count={landscape.investigational.length}
            diseases={landscape.investigational}
            accent="blue"
            icon="flask"
          />
        )}
        {landscape.repurposingCandidates.length > 0 && (
          <DiseaseGroup
            title="Repurposing Candidates"
            count={landscape.repurposingCandidates.length}
            diseases={landscape.repurposingCandidates}
            accent="amber"
            icon="spark"
          />
        )}
      </div>
    </Panel>
  )
})

const ACCENT_STYLES = {
  emerald: {
    header: 'text-emerald-300',
    border: 'border-emerald-800/30',
    bg: 'bg-emerald-900/20',
    badge: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50',
    source: 'bg-emerald-900/30 text-emerald-400',
  },
  blue: {
    header: 'text-blue-300',
    border: 'border-blue-800/30',
    bg: 'bg-blue-900/20',
    badge: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    source: 'bg-blue-900/30 text-blue-400',
  },
  amber: {
    header: 'text-amber-300',
    border: 'border-amber-800/30',
    bg: 'bg-amber-900/20',
    badge: 'bg-amber-900/40 text-amber-300 border-amber-800/50',
    source: 'bg-amber-900/30 text-amber-400',
  },
} as const

type AccentKey = keyof typeof ACCENT_STYLES

function DiseaseGroup({
  title,
  count,
  diseases,
  accent,
  icon,
}: {
  title: string
  count: number
  diseases: LandscapeDisease[]
  accent: AccentKey
  icon: 'check' | 'flask' | 'spark'
}) {
  const style = ACCENT_STYLES[accent]
  const displayDiseases = diseases.slice(0, 15)
  const remaining = diseases.length - displayDiseases.length

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon === 'check' && (
          <svg className={`w-4 h-4 ${style.header}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        )}
        {icon === 'flask' && (
          <svg className={`w-4 h-4 ${style.header}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3a3.032 3.032 0 01-.8 2.298 3.032 3.032 0 01-2.298.8H7.298a3.032 3.032 0 01-2.298-.8 3.032 3.032 0 01-.8-2.298l5.35-4.891A2.25 2.25 0 019.75 8.818V3.104" /></svg>
        )}
        {icon === 'spark' && (
          <svg className={`w-4 h-4 ${style.header}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
        )}
        <h3 className={`text-sm font-semibold ${style.header}`}>{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}>{count}</span>
      </div>

      <div className="space-y-2">
        {displayDiseases.map((d) => (
          <DiseaseRow key={d.normalizedName} disease={d} accent={accent} />
        ))}
        {remaining > 0 && (
          <p className="text-xs text-slate-500 pl-1">+{remaining} more</p>
        )}
      </div>
    </div>
  )
}

function DiseaseRow({ disease, accent }: { disease: LandscapeDisease; accent: AccentKey }) {
  const style = ACCENT_STYLES[accent]
  const diseaseHref = disease.diseaseId
    ? `/disease/${encodeURIComponent(disease.diseaseId)}?q=${encodeURIComponent(disease.name)}`
    : disease.orphaCode
      ? `/disease/orpha:${encodeURIComponent(disease.orphaCode)}?q=${encodeURIComponent(disease.name)}`
      : null

  const nameEl = diseaseHref ? (
    <Link href={diseaseHref} className={`text-sm font-medium ${style.header} hover:underline`}>
      {disease.name}
    </Link>
  ) : (
    <span className="text-sm font-medium text-slate-200">{disease.name}</span>
  )

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-800/30 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {nameEl}
          {disease.phase != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">Phase {disease.phase}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {disease.geneSymbols.slice(0, 4).map(g => (
            <span key={g} className="text-[10px] font-mono px-1 py-0 rounded bg-slate-700/60 text-slate-400">{g}</span>
          ))}
          {disease.geneSymbols.length > 4 && (
            <span className="text-[10px] text-slate-600">+{disease.geneSymbols.length - 4}</span>
          )}
          {disease.score > 0 && (
            <span className="text-[10px] text-slate-500 ml-1">score {disease.score.toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {disease.sources.map(s => (
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${style.source}`}>{s}</span>
          ))}
          {disease.therapeuticAreas.slice(0, 2).map(ta => (
            <span key={ta} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300">{ta}</span>
          ))}
        </div>
      </div>
    </div>
  )
}