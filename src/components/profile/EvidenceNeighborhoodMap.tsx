'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import {
  buildEvidenceNeighborhood,
  type NeighborhoodNode,
} from '@/lib/evidenceNeighborhood'
import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_COLOR: Record<NeighborhoodNode['kind'], string> = {
  sponsor: 'border-sky-800/50 bg-sky-950/40 text-sky-200',
  facility: 'border-cyan-800/50 bg-cyan-950/40 text-cyan-200',
  ror: 'border-violet-800/50 bg-violet-950/40 text-violet-200',
  hospital: 'border-rose-800/50 bg-rose-950/40 text-rose-200',
  college: 'border-indigo-800/50 bg-indigo-950/40 text-indigo-200',
  'grant-org': 'border-amber-800/50 bg-amber-950/40 text-amber-200',
  literature: 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200',
}

export const EvidenceNeighborhoodMap = memo(function EvidenceNeighborhoodMap({
  moleculeName,
  clinicalTrials,
  researchOrgs,
  researchOrgsLit,
  euResearchOrgs,
  usHospitals,
  usColleges,
  nihGrants,
  literature,
  pubmedArticles,
  openAlexWorks,
  panelId,
  lastFetched,
}: {
  moleculeName: string
  clinicalTrials?: ClinicalTrial[] | null
  researchOrgs?: RorOrganization[] | null
  researchOrgsLit?: RorOrganization[] | null
  euResearchOrgs?: RorOrganization[] | null
  usHospitals?: CmsHospital[] | null
  usColleges?: UsCollege[] | null
  nihGrants?: { institute?: string; title?: string }[] | null
  literature?: unknown[] | null
  pubmedArticles?: unknown[] | null
  openAlexWorks?: unknown[] | null
  panelId?: string
  lastFetched?: Date
}) {
  const map = useMemo(
    () =>
      buildEvidenceNeighborhood({
        moleculeName,
        clinicalTrials,
        researchOrgs,
        researchOrgsLit,
        euResearchOrgs,
        usHospitals,
        usColleges,
        nihGrants,
        literature,
        pubmedArticles,
        openAlexWorks,
      }),
    [
      moleculeName,
      clinicalTrials,
      researchOrgs,
      researchOrgsLit,
      euResearchOrgs,
      usHospitals,
      usColleges,
      nihGrants,
      literature,
      pubmedArticles,
      openAlexWorks,
    ],
  )

  const byKind = useMemo(() => {
    const g: Partial<Record<NeighborhoodNode['kind'], NeighborhoodNode[]>> = {}
    for (const n of map.nodes) {
      if (n.id.startsWith('mol:')) continue
      ;(g[n.kind] ||= []).push(n)
    }
    return g
  }, [map.nodes])

  const hasEdges = map.edges.length > 0

  return (
    <Panel
      title="Evidence neighborhood"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        !hasEdges
          ? 'Load Clinical & Safety + Research & Literature for sponsors, ROR orgs, hospitals, grants, and literature density.'
          : undefined
      }
    >
      <div className="space-y-4" data-testid="evidence-neighborhood-map">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Deterministic join of free public sources around {map.moleculeName}: trial sponsors/sites,
          ROR orgs, CMS hospitals, US colleges, NIH institutes, literature counts. Not competitive
          intelligence rankings or clinical referral.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ['Trials', map.stats.trialCount],
              ['Sponsors', map.stats.uniqueSponsors],
              ['Facilities', map.stats.uniqueFacilities],
              ['ROR orgs', map.stats.rorOrgCount],
              ['Hospitals', map.stats.hospitalCount],
              ['Colleges', map.stats.collegeCount],
              ['Grant orgs', map.stats.grantInstituteCount],
              ['Lit rows', map.stats.literatureCount],
            ] as const
          ).map(([label, n]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-center"
            >
              <p className="text-sm font-semibold text-slate-100">{n}</p>
              <p className="text-[9px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {map.stats.countryHints.length > 0 && (
          <p className="text-[10px] text-slate-500">
            Geography hints: {map.stats.countryHints.join(' · ')}
          </p>
        )}
        {map.notes.map((n) => (
          <p key={n} className="text-[10px] text-amber-500/90">
            {n}
          </p>
        ))}

        {/* Simple radial-ish layout: center subject + kind columns */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="flex justify-center mb-4">
            <div className="rounded-full border-2 border-emerald-700/60 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-200">
              {map.moleculeName}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['sponsor', 'Trial sponsors'],
                ['facility', 'Trial facilities'],
                ['ror', 'Research orgs (ROR)'],
                ['hospital', 'US hospitals'],
                ['college', 'US colleges'],
                ['grant-org', 'NIH grant institutes'],
                ['literature', 'Literature'],
              ] as const
            ).map(([kind, title]) => {
              const list = byKind[kind]
              if (!list?.length) return null
              return (
                <div key={kind}>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                    {title}
                  </h4>
                  <ul className="flex flex-wrap gap-1.5">
                    {list.slice(0, 10).map((n) => (
                      <li key={n.id}>
                        {n.href ? (
                          <a
                            href={n.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block text-[10px] rounded border px-2 py-1 hover:opacity-90 ${KIND_COLOR[n.kind]}`}
                            title={n.detail}
                            onClick={() =>
                              onDeepLinkClick('other', n.href!, {
                                panelId: panelId || 'evidence-neighborhood',
                                label: n.kind,
                              })
                            }
                          >
                            {n.label}
                            {n.count != null ? ` (${n.count})` : ''}
                          </a>
                        ) : (
                          <span
                            className={`inline-block text-[10px] rounded border px-2 py-1 ${KIND_COLOR[n.kind]}`}
                            title={n.detail}
                          >
                            {n.label}
                            {n.count != null ? ` (${n.count})` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Panel>
  )
})
