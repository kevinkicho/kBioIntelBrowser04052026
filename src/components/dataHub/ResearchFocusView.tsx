'use client'

/**
 * Research-centered dense tables: literature · grants · trials · structures.
 * Of-record presentation of loaded free public API rows only.
 */

import { useMemo } from 'react'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'
import { ResearchViewPrefsBar } from '@/components/dataHub/ResearchViewPrefsBar'
import { GrantLandscapeStrip } from '@/components/dataHub/GrantLandscapeStrip'
import { useResearchViewPrefs } from '@/hooks/useResearchViewPrefs'
import { isResearchTableEnabled } from '@/lib/researchViewPrefs'
import Link from 'next/link'
function asArr(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = data[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
}

function s(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v.trim() || '—'
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return '—'
}

function href(raw?: string | null): string | null {
  const u = (raw || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
}

function litHref(row: Record<string, unknown>): string | null {
  const direct = href(s(row.url) === '—' ? null : s(row.url))
  if (direct) return direct
  const doi = s(row.doi)
  if (doi !== '—') {
    const d = doi.replace(/^https?:\/\/doi\.org\//i, '')
    return `https://doi.org/${d}`
  }
  const pmid = s(row.pmid)
  if (pmid !== '—' && /^\d+$/.test(pmid)) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
  return null
}

function grantHref(row: Record<string, unknown>): string | null {
  const num = s(row.projectNumber)
  if (num !== '—') {
    return `https://reporter.nih.gov/search/${encodeURIComponent(num)}/projects`
  }
  return null
}

function trialHref(row: Record<string, unknown>): string | null {
  const nct = s(row.nctId)
  if (nct !== '—' && /^NCT\d+/i.test(nct)) {
    return `https://clinicaltrials.gov/study/${nct}`
  }
  return null
}

function pdbHref(row: Record<string, unknown>): string | null {
  const id = s(row.pdbId) !== '—' ? s(row.pdbId) : s(row.id)
  if (id !== '—') return `https://www.rcsb.org/structure/${encodeURIComponent(id)}`
  return null
}

interface TableProps {
  title: string
  source: string
  help: string
  columns: string[]
  rows: string[][]
  links: (string | null)[]
  testId: string
  emptyMessage: string
}

function ResearchTable({
  title,
  source,
  help,
  columns,
  rows,
  links,
  testId,
  emptyMessage,
}: TableProps) {
  return (
    <section
      className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
          <HelperTip content={help} label={`About ${title}`} />
          <span className="text-[9px] text-slate-500">{source}</span>
        </div>
        <span className="text-[9px] tabular-nums text-slate-500">
          {rows.length} row{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wide text-slate-600">
                {columns.map((c, ci) => (
                  <th
                    key={c}
                    className={`px-2 py-1 font-semibold ${
                      ci === 0 ? 'w-[36%]' : ci === columns.length - 1 ? 'w-[14%]' : ''
                    }`}
                  >
                    {c}
                  </th>
                ))}
                <th className="w-12 px-1.5 py-1 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => {
                const empty = cells.every((c) => isEmptyMetric(c) || c === '—')
                const link = links[i]
                return (
                  <tr
                    key={i}
                    className={`border-t border-slate-800/50 ${emptyDataClass(empty)}`}
                  >
                    {cells.map((cell, j) => (
                      <td
                        key={j}
                        className={`px-2 py-1 text-[11px] leading-snug ${
                          j === 0 ? 'text-slate-100 font-medium' : 'text-slate-400'
                        }`}
                      >
                        <span className="line-clamp-2 break-words">{cell}</span>
                      </td>
                    ))}
                    <td className="px-1.5 py-1">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onDeepLinkClick(source, link, { label: title })}
                          className="text-[10px] text-emerald-300 hover:underline"
                          title="Open source"
                        >
                          ↗
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export interface ResearchFocusViewProps {
  data: Record<string, unknown>
  entityLabel: string
  className?: string
  /** Max rows per table (overrides saved prefs when set) */
  limit?: number
  testId?: string
  /** Show domain pin bar (default true) */
  showPrefsBar?: boolean
}

/**
 * Research focus: literature, grants, trials, structures from loaded bags.
 */
export function ResearchFocusView({
  data,
  entityLabel,
  className = '',
  limit: limitProp,
  testId = 'research-focus',
  showPrefsBar = true,
}: ResearchFocusViewProps) {
  const { prefs } = useResearchViewPrefs()
  const limit = limitProp ?? prefs.tableRowLimit

  const lit = useMemo(() => {
    const rows = [
      ...asArr(data, 'literature'),
      ...asArr(data, 'pubmedArticles'),
      ...asArr(data, 'openAlexWorks'),
      ...asArr(data, 'semanticPapers'),
    ].slice(0, limit)
    return {
      cells: rows.map((r) => [
        s(r.title).slice(0, 120),
        s(r.year) !== '—'
          ? s(r.year)
          : s(r.publicationDate).slice(0, 4) !== '—'
            ? s(r.publicationDate).slice(0, 4)
            : s(r.pubDate).slice(0, 4),
        s(r.journal).slice(0, 40),
        s(r.doi) !== '—' ? s(r.doi) : s(r.pmid),
      ]),
      links: rows.map(litHref),
    }
  }, [data, limit])

  const grants = useMemo(() => {
    const rows = asArr(data, 'nihGrants').slice(0, limit)
    return {
      cells: rows.map((r) => [
        s(r.title).slice(0, 100),
        s(r.piName),
        s(r.institute).slice(0, 40),
        s(r.startDate).slice(0, 10),
        s(r.projectNumber),
      ]),
      links: rows.map(grantHref),
    }
  }, [data, limit])

  const trials = useMemo(() => {
    const rows = asArr(data, 'clinicalTrials').slice(0, limit)
    return {
      cells: rows.map((r) => [
        s(r.nctId),
        s(r.title).slice(0, 90),
        s(r.phase),
        s(r.status),
        Array.isArray(r.conditions)
          ? (r.conditions as unknown[]).slice(0, 2).map(String).join('; ')
          : '—',
      ]),
      links: rows.map(trialHref),
    }
  }, [data, limit])

  const structures = useMemo(() => {
    const rows = asArr(data, 'pdbStructures').slice(0, limit)
    return {
      cells: rows.map((r) => [
        s(r.pdbId) !== '—' ? s(r.pdbId) : s(r.id),
        s(r.title).slice(0, 80),
        s(r.method),
        s(r.resolution),
      ]),
      links: rows.map(pdbHref),
    }
  }, [data, limit])

  const showLit = isResearchTableEnabled(prefs, 'literature')
  const showGrants = isResearchTableEnabled(prefs, 'grants')
  const showTrials = isResearchTableEnabled(prefs, 'trials')
  const showStruct = isResearchTableEnabled(prefs, 'structures')

  const yearHist = useMemo(() => {
    const m = new Map<string, number>()
    for (const cells of lit.cells) {
      const y = cells[1]
      if (y && y !== '—') m.set(y, (m.get(y) || 0) + 1)
    }
    return Array.from(m.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
  }, [lit.cells])

  const oaCount = useMemo(() => {
    // open-access-ish: DOI present or europepmc/pmc style links
    return lit.links.filter((h) => h && (/doi\.org|pmc|europepmc|plos/i.test(h) || true)).length
  }, [lit.links])

  const total =
    (showLit ? lit.cells.length : 0) +
    (showGrants ? grants.cells.length : 0) +
    (showTrials ? trials.cells.length : 0) +
    (showStruct ? structures.cells.length : 0)

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      <header className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">Research view</h2>
          <HelperTip
            content={[
              `Dense public-record tables for ${entityLabel}.`,
              'Literature · NIH grants · clinical trials · PDB structures from free APIs loaded on this page.',
              'Pin tables below — saved in this browser only. Not model-generated. Not clinical decision support.',
            ].join('\n\n')}
            label="About research view"
          />
          <span className="rounded-full border border-indigo-800/40 bg-indigo-950/30 px-2 py-0.5 text-[9px] text-indigo-200">
            {total} research rows
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Of-record tables only · session-loaded samples ·{' '}
          <Link href="/methodology#honesty" className="text-indigo-400 hover:underline">
            honesty rules
          </Link>
          {' · '}
          <Link
            href="/methodology#kit-diff"
            className="text-indigo-400 hover:underline"
            data-testid={`${testId}-kit-diff-link`}
          >
            Diff two research kits
          </Link>
        </p>
      </header>

      <div
        className="rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2"
        data-testid={`${testId}-kit-diff-teaser`}
      >
        <p className="text-[11px] text-slate-400">
          Freeze evidence with a <strong className="font-medium text-slate-300">Research kit</strong>{' '}
          export, then compare sessions with the{' '}
          <Link href="/methodology#kit-diff" className="text-indigo-400 hover:underline">
            kit-diff tool
          </Link>
          — of-record fact changes only (content hashes), not clinical conclusions.
        </p>
      </div>

      {showPrefsBar && (
        <ResearchViewPrefsBar mode="research" testId={`${testId}-prefs`} />
      )}

      {showLit && yearHist.length > 0 && (
        <div
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
          data-testid={`${testId}-year-hist`}
        >
          <p className="mb-1 text-[10px] font-semibold text-slate-400">
            Literature years (session sample)
            {oaCount > 0 && (
              <span className="ml-2 font-normal text-slate-600">
                · {oaCount} rows with open registry links
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1">
            {yearHist.map(([y, n]) => (
              <span
                key={y}
                className="rounded border border-slate-700 bg-slate-950/50 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300"
              >
                {y} · {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {showGrants && <GrantLandscapeStrip data={data} testId={`${testId}-grants-strip`} />}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {showLit && (
          <div className="min-w-0 xl:col-span-2">
            <ResearchTable
              title="Literature"
              source="Europe PMC / PubMed / OpenAlex"
              help="Paper titles, years, venues from free literature APIs. Open DOI/PubMed when available."
              columns={['Title', 'Year', 'Venue', 'DOI/PMID']}
              rows={lit.cells}
              links={lit.links}
              testId={`${testId}-lit`}
              emptyMessage="No literature rows loaded yet — open Research & Literature category panels or wait for fetch. See methodology for why empty."
            />
          </div>
        )}

        {showGrants && (
          <div className="min-w-0">
            <ResearchTable
              title="NIH grants"
              source="NIH RePORTER"
              help="Grant titles, PIs, and institutes from free NIH RePORTER. Affiliation context for research activity."
              columns={['Title', 'PI', 'Institute', 'Start', 'Project #']}
              rows={grants.cells}
              links={grants.links}
              testId={`${testId}-grants`}
              emptyMessage="No NIH grant rows loaded yet."
            />
          </div>
        )}

        {showTrials && (
          <div className="min-w-0">
            <ResearchTable
              title="Clinical trials"
              source="ClinicalTrials.gov"
              help="Registered studies from CT.gov. Phase/status are registry fields — not efficacy conclusions."
              columns={['NCT', 'Title', 'Phase', 'Status', 'Conditions']}
              rows={trials.cells}
              links={trials.links}
              testId={`${testId}-trials`}
              emptyMessage="No clinical trial rows loaded yet."
            />
          </div>
        )}

        {showStruct && (
          <div className="min-w-0 xl:col-span-2">
            <ResearchTable
              title="Structures"
              source="RCSB PDB"
              help="Experimental structures linked to this entity name/search. Open RCSB for full record."
              columns={['PDB', 'Title', 'Method', 'Resolution']}
              rows={structures.cells}
              links={structures.links}
              testId={`${testId}-structures`}
              emptyMessage="No PDB structure rows loaded yet — open Protein & Structure category."
            />
          </div>
        )}
      </div>
    </div>
  )
}
