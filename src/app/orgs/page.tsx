'use client'

import { useCallback, useMemo, useState } from 'react'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import {
  buildOrgAffiliationJoins,
  parseSponsorHints,
  type AffiliationEdge,
} from '@/lib/orgAffiliationJoin'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_LABEL: Record<AffiliationEdge['kind'], string> = {
  'sponsor-ror': 'Sponsor → ROR',
  'ror-hospital': 'ROR → hospital',
  'ror-college': 'ROR → college',
  'hospital-college': 'Hospital → college',
}

/**
 * Free public org / hospital / college search (ROR + CMS + Scorecard + EU packs).
 * Affiliation context for research — not clinical referral or admissions advice.
 */
export default function OrgsPage() {
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [euPack, setEuPack] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState<RorOrganization[]>([])
  const [euOrgs, setEuOrgs] = useState<RorOrganization[]>([])
  const [hospitals, setHospitals] = useState<CmsHospital[]>([])
  const [colleges, setColleges] = useState<UsCollege[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sponsorText, setSponsorText] = useState('')

  const runSearch = useCallback(async () => {
    const query = q.trim()
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

  const affiliation = useMemo(() => {
    const sponsors = parseSponsorHints(sponsorText)
    const rorAll = [...orgs, ...euOrgs]
    // Dedupe ROR by id
    const seen = new Set<string>()
    const rorDeduped: RorOrganization[] = []
    for (const o of rorAll) {
      if (seen.has(o.rorId)) continue
      seen.add(o.rorId)
      rorDeduped.push(o)
    }
    return buildOrgAffiliationJoins({
      sponsors,
      rorOrgs: rorDeduped,
      hospitals,
      colleges,
    })
  }, [sponsorText, orgs, euOrgs, hospitals, colleges])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Free public registries
        </p>
        <h1 className="text-2xl font-semibold text-slate-100">
          Orgs, colleges &amp; hospitals
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">
          ROR research organizations (global), EU research org packs, US College Scorecard, and CMS
          Medicare hospitals — plus deterministic sponsor↔ROR↔site name joins. Affiliation /
          directory context only — not clinical referral or admissions advice.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          <a
            href="https://ror.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            ROR
          </a>
          {' · '}
          <a
            href="https://collegescorecard.ed.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            College Scorecard
          </a>
          {' · '}
          <a
            href="https://data.cms.gov/provider-data/dataset/xubh-q36u"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            CMS hospitals
          </a>
        </p>
      </div>

      <form
        className="flex flex-col gap-2 mb-6"
        onSubmit={(e) => {
          e.preventDefault()
          void runSearch()
        }}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Mayo, Harvard, Karolinska, Pasteur…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            data-testid="orgs-search-input"
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            aria-label="Country filter (ROR)"
          >
            <option value="">All countries (ROR)</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="BE">Belgium</option>
            <option value="DK">Denmark</option>
            <option value="AT">Austria</option>
            <option value="IE">Ireland</option>
            <option value="CH">Switzerland</option>
            <option value="CA">Canada</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-700/80 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={euPack}
            onChange={(e) => setEuPack(e.target.checked)}
            className="rounded border-slate-600"
          />
          Force multi-country EU research pack (ROR education/healthcare/facility)
        </label>
      </form>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      <section
        className="mb-8 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
        data-testid="orgs-affiliation-join"
      >
        <h2 className="text-sm font-semibold text-slate-100 mb-1">
          Sponsor ↔ ROR ↔ site joins
          {affiliation.edges.length ? ` · ${affiliation.edges.length}` : ''}
        </h2>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Paste trial sponsor names (one per line). Overlaps are computed against the ROR / hospital
          / college results below using token matching — not official affiliation graphs.
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
            Run a search and/or paste sponsors to see affiliation edges.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
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
                  {e.leftHref ? (
                    <a
                      href={e.leftHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-300 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', e.leftHref!, {
                          panelId: 'orgs-join',
                          label: e.kind,
                        })
                      }
                    >
                      {e.leftLabel}
                    </a>
                  ) : (
                    e.leftLabel
                  )}
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
                {e.detail && <p className="text-[10px] text-slate-500 mt-0.5">{e.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          Research organizations (ROR){orgs.length ? ` · ${orgs.length}` : ''}
        </h2>
        {orgs.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No ROR hits yet — run a search.</p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li
                key={o.rorId}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                data-testid="orgs-ror-row"
              >
                <p className="text-sm text-slate-100 font-medium">{o.name}</p>
                <p className="text-[11px] text-slate-500">
                  {[o.city, o.countryName, o.types.join(', ')].filter(Boolean).join(' · ')}
                </p>
                <a
                  href={`https://ror.org/${o.rorId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  ror.org/{o.rorId} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          EU research orgs pack{euOrgs.length ? ` · ${euOrgs.length}` : ''}
        </h2>
        <p className="text-[10px] text-slate-500 mb-2">
          Country-filtered ROR (not a complete EU hospital census).
        </p>
        {euOrgs.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No EU pack hits yet.</p>
        ) : (
          <ul className="space-y-2">
            {euOrgs.map((o) => (
              <li
                key={`eu-${o.rorId}`}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                data-testid="orgs-eu-row"
              >
                <p className="text-sm text-slate-100 font-medium">{o.name}</p>
                <p className="text-[11px] text-slate-500">
                  {[o.city, o.countryName, o.types.join(', '), o.matchSource]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <a
                  href={`https://ror.org/${o.rorId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  ror.org/{o.rorId} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          US colleges (Scorecard){colleges.length ? ` · ${colleges.length}` : ''}
        </h2>
        {colleges.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No Scorecard hits yet.</p>
        ) : (
          <ul className="space-y-2">
            {colleges.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                data-testid="orgs-college-row"
              >
                <p className="text-sm text-slate-100 font-medium">{c.name}</p>
                <p className="text-[11px] text-slate-500">
                  {[c.city, c.state, c.ownership, c.predominantDegree].filter(Boolean).join(' · ')}
                </p>
                <a
                  href={c.scorecardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Scorecard ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          US hospitals (CMS Medicare){hospitals.length ? ` · ${hospitals.length}` : ''}
        </h2>
        <p className="text-[10px] text-slate-500 mb-2">US only.</p>
        {hospitals.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No CMS hospital hits yet.</p>
        ) : (
          <ul className="space-y-2">
            {hospitals.map((h) => (
              <li
                key={h.facilityId}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                data-testid="orgs-cms-row"
              >
                <p className="text-sm text-slate-100 font-medium">{h.facilityName}</p>
                <p className="text-[11px] text-slate-500">
                  {[h.city, h.state, h.hospitalType].filter(Boolean).join(' · ')}
                  {h.overallRating && h.overallRating !== 'Not Available'
                    ? ` · rating ${h.overallRating}`
                    : ''}
                </p>
                <a
                  href={h.careCompareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Care Compare ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
