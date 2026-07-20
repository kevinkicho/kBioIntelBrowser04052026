'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'

/**
 * Free public org / hospital search (ROR + CMS).
 * Affiliation context for research — not clinical referral.
 */
export default function OrgsPage() {
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState<RorOrganization[]>([])
  const [hospitals, setHospitals] = useState<CmsHospital[]>([])
  const [error, setError] = useState<string | null>(null)

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
      const [rorRes, cmsRes] = await Promise.all([
        fetch(`/api/ror?${params.toString()}`),
        fetch(`/api/cms-hospitals?q=${encodeURIComponent(query)}&limit=20`),
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
      if (!rorJson.ok && !cmsJson.ok) {
        setError(rorJson.error || cmsJson.error || 'Search failed')
        setOrgs([])
        setHospitals([])
      } else {
        setOrgs(rorJson.orgs || [])
        setHospitals(cmsJson.hospitals || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [q, country])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Free public registries
        </p>
        <h1 className="text-2xl font-semibold text-slate-100">
          Research orgs &amp; US hospitals
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">
          Search the Research Organization Registry (ROR — universities, institutes, research
          hospitals worldwide) and CMS Medicare hospital registry (US). Evidence affiliation
          context only — not clinical referral or “best hospital” advice.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Design notes:{' '}
          <Link href="/how-it-works" className="text-indigo-400 hover:underline">
            How it works
          </Link>
          {' · '}
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
        className="flex flex-col sm:flex-row gap-2 mb-6"
        onSubmit={(e) => {
          e.preventDefault()
          void runSearch()
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Mayo Clinic, Harvard, Karolinska…"
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
      </form>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

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

      <section>
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          US hospitals (CMS Medicare){hospitals.length ? ` · ${hospitals.length}` : ''}
        </h2>
        <p className="text-[10px] text-slate-500 mb-2">
          US only. Country filter does not apply to CMS.
        </p>
        {hospitals.length === 0 && !loading ? (
          <p className="text-xs text-slate-500">No CMS hospital hits yet — run a search.</p>
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
