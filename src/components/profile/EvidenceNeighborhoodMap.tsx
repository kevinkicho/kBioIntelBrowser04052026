'use client'

/**
 * Evidence neighborhood — compact multi-source join card.
 * Opacity-30 for zero/empty metrics; chips clickable only with real deep links;
 * rich hover tooltips; Panel bottom-bar provenance via panelSources.
 */

import { memo, useId, useMemo, useState, type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'
import {
  buildEvidenceNeighborhood,
  type NeighborhoodNode,
} from '@/lib/evidenceNeighborhood'
import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { isEmptyMetric } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl, preferStableDeepLink } from '@/lib/deepLinkPolicy'

const KIND_COLOR: Record<NeighborhoodNode['kind'], string> = {
  sponsor: 'border-sky-800/50 bg-sky-950/40 text-sky-200',
  facility: 'border-cyan-800/50 bg-cyan-950/40 text-cyan-200',
  ror: 'border-violet-800/50 bg-violet-950/40 text-violet-200',
  hospital: 'border-rose-800/50 bg-rose-950/40 text-rose-200',
  college: 'border-indigo-800/50 bg-indigo-950/40 text-indigo-200',
  'grant-org': 'border-amber-800/50 bg-amber-950/40 text-amber-200',
  literature: 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200',
}

const KIND_LABEL: Record<NeighborhoodNode['kind'], string> = {
  sponsor: 'Trial sponsor',
  facility: 'Trial site',
  ror: 'ROR org',
  hospital: 'CMS hospital',
  college: 'US college',
  'grant-org': 'NIH institute',
  literature: 'Literature',
}

const SOURCE_CHIPS: { label: string; title: string; href: string }[] = [
  {
    label: 'CT.gov',
    title: 'ClinicalTrials.gov — sponsors & facilities from registered studies',
    href: 'https://clinicaltrials.gov/data-api/about-api',
  },
  {
    label: 'ROR',
    title: 'Research Organization Registry — CC0 research org IDs',
    href: 'https://ror.org/search',
  },
  {
    label: 'CMS',
    title: 'CMS Care Compare — US Medicare hospital directory',
    href: 'https://data.cms.gov/provider-data/dataset/xubh-q36u',
  },
  {
    label: 'Scorecard',
    title: 'US College Scorecard — institutional directory (not admissions)',
    href: 'https://collegescorecard.ed.gov/data/api-documentation/',
  },
  {
    label: 'RePORTER',
    title: 'NIH RePORTER — extramural grant institutes',
    href: 'https://api.reporter.nih.gov/',
  },
  {
    label: 'Lit',
    title: 'Europe PMC / PubMed / OpenAlex literature row counts',
    href: 'https://europepmc.org/',
  },
]

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
  const stats = [
    ['Trials', map.stats.trialCount],
    ['Sponsors', map.stats.uniqueSponsors],
    ['Sites', map.stats.uniqueFacilities],
    ['ROR', map.stats.rorOrgCount],
    ['Hospitals', map.stats.hospitalCount],
    ['Colleges', map.stats.collegeCount],
    ['Grants', map.stats.grantInstituteCount],
    ['Lit', map.stats.literatureCount],
  ] as const

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
      <div className="space-y-3" data-testid="evidence-neighborhood-map">
        {/* Compact intro + source chips (replaces long prose) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400">
            Free join · <span className="text-slate-200 font-medium">{map.moleculeName}</span>
          </span>
          <span className="text-[9px] text-slate-600">·</span>
          {SOURCE_CHIPS.map((c) => (
            <ChipTooltip key={c.label} title={c.label} body={c.title}>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 hover:border-indigo-700/50 hover:text-indigo-300"
                onClick={() =>
                  onDeepLinkClick('other', c.href, {
                    panelId: panelId || 'evidence-neighborhood',
                    label: `src-${c.label}`,
                  })
                }
              >
                {c.label}
              </a>
            </ChipTooltip>
          ))}
          <span className="text-[9px] text-slate-600">· not ranking / referral</span>
        </div>

        {/* Stats — dim zero/empty at opacity 0.3 */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {stats.map(([label, n]) => {
            const empty = isEmptyMetric(n)
            return (
              <div
                key={label}
                className={`rounded-md border border-slate-800 bg-slate-950/50 px-1.5 py-1 text-center ${
                  empty ? 'opacity-30' : ''
                }`}
                data-empty={empty ? 'true' : 'false'}
              >
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    empty ? 'text-slate-500' : 'text-slate-100'
                  }`}
                >
                  {n}
                </p>
                <p className="text-[8px] text-slate-500 leading-tight">{label}</p>
              </div>
            )
          })}
        </div>

        {map.stats.countryHints.length > 0 && (
          <p className="text-[9px] text-slate-500">
            Geo: {map.stats.countryHints.slice(0, 8).join(' · ')}
          </p>
        )}
        {map.notes.map((n) => (
          <p key={n} className="text-[9px] text-amber-500/90">
            {n}
          </p>
        ))}

        {/* Compact chip columns */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-2.5">
          <div className="mb-2 flex justify-center">
            <div className="rounded-full border border-emerald-700/50 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              {map.moleculeName}
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(
              [
                ['sponsor', 'Sponsors'],
                ['facility', 'Sites'],
                ['ror', 'ROR orgs'],
                ['hospital', 'Hospitals'],
                ['college', 'Colleges'],
                ['grant-org', 'Grant orgs'],
                ['literature', 'Literature'],
              ] as const
            ).map(([kind, title]) => {
              const list = byKind[kind]
              if (!list?.length) return null
              return (
                <div key={kind}>
                  <h4 className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    {title}
                    <span className="ml-1 font-mono text-slate-600">{list.length}</span>
                  </h4>
                  <ul className="flex flex-wrap gap-1">
                    {list.slice(0, 10).map((n) => (
                      <li key={n.id}>
                        <NodeChip
                          node={n}
                          panelId={panelId || 'evidence-neighborhood'}
                        />
                      </li>
                    ))}
                    {list.length > 10 && (
                      <li className="text-[9px] text-slate-600 self-center">
                        +{list.length - 10}
                      </li>
                    )}
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

function NodeChip({ node, panelId }: { node: NeighborhoodNode; panelId: string }) {
  const rawHref = node.href?.trim() || ''
  // Only http(s) registry links; reject homepage shells
  const href =
    rawHref.startsWith('http') && !isBrokenSourceShellUrl(rawHref)
      ? preferStableDeepLink(rawHref, rawHref)
      : ''
  const clickable = Boolean(href)
  const emptyCount = node.count != null && isEmptyMetric(node.count)
  const tone = KIND_COLOR[node.kind]
  const dim = emptyCount ? 'opacity-30' : ''

  const tooltipTitle = KIND_LABEL[node.kind]
  const tooltipBody = [
    node.detail || null,
    clickable
      ? `Opens official ${KIND_LABEL[node.kind].toLowerCase()} record in a new tab.`
      : 'No stable deep link for this row — not clickable.',
    node.count != null ? `Count: ${node.count}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const label = (
    <>
      <span className="truncate max-w-[11rem]">{node.label}</span>
      {node.count != null ? (
        <span className="font-mono tabular-nums opacity-80">({node.count})</span>
      ) : null}</>
  )

  const baseClass = `inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-snug ${tone} ${dim}`

  if (clickable) {
    return (
      <ChipTooltip title={tooltipTitle} body={tooltipBody} name={node.label}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} hover:brightness-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500`}
          data-testid="evidence-neighborhood-chip"
          data-clickable="true"
          onClick={() =>
            onDeepLinkClick('other', href, {
              panelId,
              label: node.kind,
            })
          }
        >
          {label}
        </a>
      </ChipTooltip>
    )
  }

  // No deep link → non-interactive chip (not a button, not an <a>)
  return (
    <ChipTooltip title={tooltipTitle} body={tooltipBody} name={node.label}>
      <span
        className={`${baseClass} cursor-default`}
        data-testid="evidence-neighborhood-chip"
        data-clickable="false"
      >
        {label}
      </span>
    </ChipTooltip>
  )
}

/** Styled rich tooltip (hover + focus) — more detail than native title. */
function ChipTooltip({
  title,
  body,
  name,
  children,
}: {
  title: string
  body: string
  name?: string
  children: ReactNode
}) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const panelId = `${uid}-tip`

  return (
    <span
      className="relative inline-flex max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          id={panelId}
          role="tooltip"
          style={{ zIndex: STYLED_TOOLTIP_Z }}
          className="pointer-events-none absolute bottom-full left-0 mb-1.5 w-56 rounded-lg border border-slate-600 bg-slate-900 p-2 shadow-xl"
        >
          <span className="block text-[9px] font-semibold uppercase tracking-wide text-indigo-300/90">
            {title}
          </span>
          {name && (
            <span className="mt-0.5 block text-[11px] font-medium text-slate-100 leading-snug">
              {name}
            </span>
          )}
          <span className="mt-1 block text-[10px] text-slate-400 leading-relaxed">{body}</span>
        </span>
      )}
    </span>
  )
}
