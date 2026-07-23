'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { ResearchLabDossier } from '@/lib/researchLabs'
import {
  buildOrgAffiliationJoins,
  parseSponsorHints,
} from '@/lib/orgAffiliationJoin'
import { ResearchLabDossierView } from '@/components/orgs/ResearchLabDossierView'
import { OrgSearchSuggest } from '@/components/orgs/OrgSearchSuggest'
import { OrgDirectoryList } from '@/components/orgs/OrgDirectoryList'
import { OrgAffiliationJoinList } from '@/components/orgs/OrgAffiliationJoinList'
import type { OrgSuggestion } from '@/lib/orgs/orgSuggest'
import { HelperTip } from '@/components/ui/HelperTip'

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
    <div className="page-canvas">
      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-0.5">
          Free public registries · research-lab pipeline
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Universities, colleges &amp; research labs
          </h1>
          <HelperTip
            content="Parallel free-API pipeline: ROR, OpenAlex institutions, College Scorecard, CMS hospitals, NIH RePORTER, OpenAIRE — assembled into a claim-bound lab dossier with optional AI activities (BYOM Ollama). Affiliation / directory context only — not admissions or clinical referral."
            label="About research orgs"
            testId="orgs-page-help"
            maxWidth="22rem"
          />
        </div>
      </div>

      <form
        className="relative z-50 mb-4 flex flex-col gap-2 overflow-visible"
        onSubmit={(e) => {
          e.preventDefault()
          void runAll()
        }}
      >
        <div className="relative z-50 flex flex-col gap-2 overflow-visible sm:flex-row sm:items-start">
          <OrgSearchSuggest
            value={q}
            onChange={setQ}
            country={country}
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
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
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
            className="shrink-0 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="orgs-run-pipeline"
          >
            {loading || dossierLoading ? 'Running pipeline…' : 'Build dossier + search'}
          </button>
        </div>
        <p className="text-[10px] text-slate-600">
          Type 2+ characters for a live dropdown (ROR · US College Scorecard · OpenAlex). Arrow
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
        <div data-testid="orgs-directory-tab">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-100">Directory</h2>
            <HelperTip
              content="Unified free-API directory: ROR, EU research pack, US College Scorecard, CMS hospitals. Affiliation context only — not admissions or clinical referral."
              label="About org directory"
              testId="orgs-directory-help"
            />
          </div>
          <OrgDirectoryList
            orgs={orgs}
            euOrgs={euOrgs}
            colleges={colleges}
            hospitals={hospitals}
            loading={loading}
          />
        </div>
      )}

      {tab === 'joins' && (
        <div data-testid="orgs-joins-tab">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-100">
              Sponsor ↔ ROR ↔ site joins
              {affiliation.edges.length ? (
                <span className="ml-1 font-normal text-slate-500">
                  · {affiliation.edges.length}
                </span>
              ) : null}
            </h2>
            <HelperTip
              content="Paste trial sponsors or use NIH grant institutes from the dossier. Edges are deterministic token overlap only — not official affiliation graphs or clinical referral."
              label="About affiliation joins"
              testId="orgs-joins-help"
            />
          </div>
          <textarea
            value={sponsorText}
            onChange={(e) => setSponsorText(e.target.value)}
            rows={3}
            placeholder={'e.g.\nMayo Clinic\nHarvard Medical School\nPfizer'}
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            data-testid="orgs-sponsor-input"
          />
          <OrgAffiliationJoinList edges={affiliation.edges} notes={affiliation.notes} />
        </div>
      )}
    </div>
  )
}

export default function OrgsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-canvas text-sm text-slate-400">Loading orgs…</div>
      }
    >
      <OrgsPageInner />
    </Suspense>
  )
}
