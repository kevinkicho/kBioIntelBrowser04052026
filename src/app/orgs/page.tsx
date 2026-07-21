'use client'

import { useCallback, useEffect, useMemo, useState, Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { ResearchLabDossier } from '@/lib/researchLabs'
import {
  buildOrgAffiliationJoins,
  parseSponsorHints,
  type AffiliationEdge,
} from '@/lib/orgAffiliationJoin'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { ResearchLabDossierView } from '@/components/orgs/ResearchLabDossierView'
import { OrgSearchSuggest } from '@/components/orgs/OrgSearchSuggest'
import type { OrgSuggestion } from '@/lib/orgs/orgSuggest'

const KIND_LABEL: Record<AffiliationEdge['kind'], string> = {
  'sponsor-ror': 'Sponsor → ROR',
  'ror-hospital': 'ROR → hospital',
  'ror-college': 'ROR → college',
  'hospital-college': 'Hospital → college',
}

type TabId = 'dossier' | 'directory' | 'joins'

/**
 * Free public org / hospital / college / research-lab module.
 * Affiliation context — not clinical referral or admissions advice.
 */
function OrgsPageInner() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q')?.trim() || ''

  const [tab, setTab] = useState<TabId>('dossier')
  const [q, setQ] = useState(initialQ)
  const [country, setCountry] = useState('')
  const [euPack, setEuPack] = useState(true)
  const [loading, setLoading] = useState(false)
  const [dossierLoading, setDossierLoading] = useState(false)
  const [orgs, setOrgs] = useState<RorOrganization[]>([])
  const [euOrgs, setEuOrgs] = useState<RorOrganization[]>([])
  const [hospitals, setHospitals] = useState<CmsHospital[]>([])
  const [colleges, setColleges] = useState<UsCollege[]>([])
  const [dossier, setDossier] = useState<ResearchLabDossier | null>(null)
  const [dossierWarnings, setDossierWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sponsorText, setSponsorText] = useState('')

  const runDirectorySearch = useCallback(async (queryOverride?: string) => {
    const query = (queryOverride ?? q).trim()
    if (query.length < 2) {
      setError('Enter at least 2 characters')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ q: query })
      if (country) params.set('country', country)
      const euParams = new URLSearchParams({ q: query })
      if (euPack) euParams.set('pack', '1')
      else if (country && country !== 'US' && country !== 'CA' && country !== 'GB') {
        euParams.set('country', country)
      } else if (!country) {
        euParams.set('pack', '1')
      }

      const [rorRes, cmsRes, collegeRes, euRes] = await Promise.all([
        fetch(`/api/ror?${params.toString()}`),
        fetch(`/api/cms-hospitals?q=${encodeURIComponent(query)}&limit=20`),
        fetch(`/api/us-colleges?q=${encodeURIComponent(query)}&limit=15`),
        fetch(`/api/eu-orgs?${euParams.toString()}`),
      ])
      const rorJson = (await rorRes.json()) as {
        ok?: boolean
        orgs?: RorOrganization[]
        error?: string
      }
      const cmsJson = (await cmsRes.json()) as {
        ok?: boolean
        hospitals?: CmsHospital[]
        error?: string
      }
      const collegeJson = (await collegeRes.json()) as {
        ok?: boolean
        colleges?: UsCollege[]
        error?: string
      }
      const euJson = (await euRes.json()) as {
        ok?: boolean
        orgs?: RorOrganization[]
        error?: string
      }

      setOrgs(rorJson.orgs || [])
      setHospitals(cmsJson.hospitals || [])
      setColleges(collegeJson.colleges || [])
      setEuOrgs(euJson.orgs || [])
      if (!rorJson.ok && !cmsJson.ok && !collegeJson.ok && !euJson.ok) {
        setError(
          rorJson.error ||
            cmsJson.error ||
            collegeJson.error ||
            euJson.error ||
            'Search failed',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [q, country, euPack])

  const runDossierPipeline = useCallback(async (queryOverride?: string) => {
    const query = (queryOverride ?? q).trim()
    if (query.length < 2) {
      setError('Enter at least 2 characters')
      return
    }
    setDossierLoading(true)
    setError(null)
    setDossierWarnings([])
    try {
      const params = new URLSearchParams({ q: query })
      if (country) params.set('country', country)
      if (euPack) params.set('euPack', '1')
      const res = await fetch(`/api/research-labs?${params.toString()}`)
      const json = (await res.json()) as {
        ok?: boolean
        dossier?: ResearchLabDossier
        warnings?: string[]
        error?: string
      }
      if (!res.ok || !json.dossier) {
        throw new Error(json.error || `Pipeline failed (${res.status})`)
      }
      setDossier(json.dossier)
      setDossierWarnings(json.warnings || [])
      setTab('dossier')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDossierLoading(false)
    }
  }, [q, country, euPack])

  const runAll = useCallback(
    async (queryOverride?: string) => {
      await Promise.all([
        runDossierPipeline(queryOverride),
        runDirectorySearch(queryOverride),
      ])
    },
    [runDossierPipeline, runDirectorySearch],
  )

  // Auto-run when linked with ?q=
  useEffect(() => {
    if (initialQ.length >= 2) {
      void runAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount with initial q
  }, [])

  const affiliation = useMemo(() => {
    const sponsors = parseSponsorHints(sponsorText)
    const rorAll = [...orgs, ...euOrgs, ...(dossier?.rorOrgs ?? [])]
    const seen = new Set<string>()
    const rorDeduped: RorOrganization[] = []
    for (const o of rorAll) {
      if (seen.has(o.rorId)) continue
      seen.add(o.rorId)
      rorDeduped.push(o)
    }
    return buildOrgAffiliationJoins({
      sponsors:
        sponsors.length > 0
          ? sponsors
          : (dossier?.grants ?? [])
              .map((g) => g.institute)
              .filter(Boolean)
              .slice(0, 20)
              .map((name) => ({ name })),
      rorOrgs: rorDeduped,
      hospitals: hospitals.length ? hospitals : dossier?.hospitals,
      colleges: colleges.length ? colleges : dossier?.colleges,
    })
  }, [sponsorText, orgs, euOrgs, hospitals, colleges, dossier])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Free public registries · research-lab pipeline
        </p>
        <h1 className="text-2xl font-semibold text-slate-100">
          Universities, colleges &amp; research labs
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-3xl">
          Parallel free-API pipeline: ROR, OpenAlex institutions, College Scorecard, CMS hospitals,
          NIH RePORTER, OpenAIRE — assembled into a claim-bound lab dossier with optional AI
          activities (BYOM Ollama). Affiliation / directory context only — not admissions or
          clinical referral.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          void runAll()
        }}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <OrgSearchSuggest
            value={q}
            onChange={setQ}
            country={country}
            disabled={loading || dossierLoading}
            onSelectSuggestion={(s: OrgSuggestion) => {
              setQ(s.name)
              if (!country && s.source === 'college' && s.countryCode === 'US') {
                setCountry('US')
              }
              // Pass name explicitly — React state may not have flushed yet
              void runAll(s.name)
            }}
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            aria-label="Country filter"
          >
            <option value="">All countries</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="CA">Canada</option>
            <option value="JP">Japan</option>
            <option value="AU">Australia</option>
          </select>
          <button
            type="submit"
            disabled={loading || dossierLoading}
            className="rounded-lg bg-emerald-700/80 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="orgs-run-pipeline"
          >
            {loading || dossierLoading ? 'Running pipeline…' : 'Build dossier + search'}
          </button>
        </div>
        <p className="text-[10px] text-slate-600">
          Type 2+ characters for live suggestions (ROR · US College Scorecard · OpenAlex). Arrow
          keys + Enter to pick; free public registries only — no mock data.
        </p>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={euPack}
            onChange={(e) => setEuPack(e.target.checked)}
            className="rounded border-slate-600"
          />
          Include multi-country EU research pack (ROR education/healthcare/facility)
        </label>
      </form>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
        {(
          [
            ['dossier', 'Lab dossier + AI'],
            ['directory', 'Directory lists'],
            ['joins', 'Sponsor joins'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === id
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            data-testid={`orgs-tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dossier' && (
        <div>
          {dossierLoading && (
            <p className="text-sm text-slate-400 animate-pulse mb-4">
              Harvesting free APIs (ROR · OpenAlex · Scorecard · CMS · RePORTER · OpenAIRE)…
            </p>
          )}
          {dossierWarnings.length > 0 && (
            <ul className="mb-3 text-[10px] text-amber-500/90 list-disc list-inside">
              {dossierWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {dossier ? (
            <ResearchLabDossierView dossier={dossier} />
          ) : (
            !dossierLoading && (
              <p className="text-sm text-slate-500">
                Enter an institution name and run the pipeline to build a claim-bound research-lab
                dossier with AI activities.
              </p>
            )
          )}
        </div>
      )}

      {tab === 'directory' && (
        <div className="space-y-8">
          <DirectorySection title="Research organizations (ROR)" count={orgs.length} loading={loading}>
            {orgs.map((o) => (
              <OrgRow
                key={o.rorId}
                name={o.name}
                meta={[o.city, o.countryName, o.types.join(', ')].filter(Boolean).join(' · ')}
                href={`https://ror.org/${o.rorId}`}
                testId="orgs-ror-row"
              />
            ))}
          </DirectorySection>
          <DirectorySection title="EU research orgs pack" count={euOrgs.length} loading={loading}>
            {euOrgs.map((o) => (
              <OrgRow
                key={`eu-${o.rorId}`}
                name={o.name}
                meta={[o.city, o.countryName, o.matchSource].filter(Boolean).join(' · ')}
                href={`https://ror.org/${o.rorId}`}
                testId="orgs-eu-row"
              />
            ))}
          </DirectorySection>
          <DirectorySection title="US colleges (Scorecard)" count={colleges.length} loading={loading}>
            {colleges.map((c) => (
              <OrgRow
                key={c.id}
                name={c.name}
                meta={[c.city, c.state, c.ownership, c.source].filter(Boolean).join(' · ')}
                href={c.scorecardUrl}
                testId="orgs-college-row"
              />
            ))}
          </DirectorySection>
          <DirectorySection
            title="US hospitals (CMS Medicare)"
            count={hospitals.length}
            loading={loading}
          >
            {hospitals.map((h) => (
              <OrgRow
                key={h.facilityId}
                name={h.facilityName}
                meta={[h.city, h.state, h.hospitalType].filter(Boolean).join(' · ')}
                href={h.careCompareUrl}
                testId="orgs-cms-row"
              />
            ))}
          </DirectorySection>
        </div>
      )}

      {tab === 'joins' && (
        <section
          className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          data-testid="orgs-affiliation-join"
        >
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Sponsor ↔ ROR ↔ site joins
            {affiliation.edges.length ? ` · ${affiliation.edges.length}` : ''}
          </h2>
          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            Paste trial sponsors or use NIH grant institutes from the dossier. Token-overlap only —
            not official affiliation graphs.
          </p>
          <textarea
            value={sponsorText}
            onChange={(e) => setSponsorText(e.target.value)}
            rows={3}
            placeholder={'e.g.\nMayo Clinic\nHarvard Medical School\nPfizer'}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 mb-3"
            data-testid="orgs-sponsor-input"
          />
          {affiliation.notes.map((n) => (
            <p key={n} className="text-[10px] text-amber-500/80 mb-2">
              {n}
            </p>
          ))}
          {affiliation.edges.length === 0 ? (
            <p className="text-xs text-slate-500">
              Run the pipeline and/or paste sponsors to see affiliation edges.
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {affiliation.edges.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                  data-testid="orgs-join-edge"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] uppercase tracking-wide rounded border border-sky-800/40 bg-sky-950/40 px-1.5 py-0.5 text-sky-300">
                      {KIND_LABEL[e.kind]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      score {(e.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-100">
                    {e.leftLabel}
                    <span className="text-slate-600 mx-1.5">↔</span>
                    {e.rightHref ? (
                      <a
                        href={e.rightHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-300 hover:underline"
                        onClick={() =>
                          onDeepLinkClick('other', e.rightHref!, {
                            panelId: 'orgs-join',
                            label: e.kind,
                          })
                        }
                      >
                        {e.rightLabel}
                      </a>
                    ) : (
                      e.rightLabel
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function DirectorySection({
  title,
  count,
  loading,
  children,
}: {
  title: string
  count: number
  loading: boolean
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-200 mb-3">
        {title}
        {count ? ` · ${count}` : ''}
      </h2>
      {count === 0 && !loading ? (
        <p className="text-xs text-slate-500">No hits yet — run search.</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  )
}

function OrgRow({
  name,
  meta,
  href,
  testId,
}: {
  name: string
  meta: string
  href: string
  testId: string
}) {
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2" data-testid={testId}>
      <p className="text-sm text-slate-100 font-medium">{name}</p>
      {meta && <p className="text-[11px] text-slate-500">{meta}</p>}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-indigo-400 hover:underline"
      >
        Open ↗
      </a>
    </li>
  )
}

export default function OrgsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-400">Loading orgs…</div>
      }
    >
      <OrgsPageInner />
    </Suspense>
  )
}
