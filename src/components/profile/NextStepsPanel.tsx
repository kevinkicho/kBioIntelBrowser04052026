'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { logAgentActivity } from '@/lib/agentActivityLog'
import {
  buildOrderCatalogLinks as buildCatalogLinksFromVars,
  extractCasFromSynonyms,
} from '@/lib/vendorCatalogLinks'

interface ActionCard {
  id: string
  icon: string
  title: string
  description: string
  color: string
  scrollTarget?: string
}

interface Props {
  moleculeName: string
  data: Record<string, unknown>
  /** PubChem CID when known — improves catalog deep links */
  cid?: number | null
}

/** @deprecated Prefer buildOrderCatalogLinks from @/lib/vendorCatalogLinks */
export function buildOrderCatalogLinks(
  moleculeName: string,
  cid?: number | null,
  cas?: string | null,
): { name: string; url: string; hint: string }[] {
  return buildCatalogLinksFromVars({ name: moleculeName, cid, cas })
}

export function NextStepsPanel({ moleculeName, data, cid }: Props) {
  const [orderOpen, setOrderOpen] = useState(false)

  const cards = useMemo(() => {
    const result: ActionCard[] = []

    const trials = data.clinicalTrials as unknown[]
    if (Array.isArray(trials) && trials.length > 0) {
      result.push({
        id: 'clinical',
        icon: '🏥',
        title: 'Review Clinical Evidence',
        description: `${trials.length} clinical trial${trials.length !== 1 ? 's' : ''} — examine phases, statuses, and outcomes`,
        color: 'indigo',
        scrollTarget: 'clinical-safety',
      })
    }

    const mechanisms = data.chemblMechanisms as unknown[]
    const activities = data.chemblActivities as unknown[]
    if (
      (Array.isArray(mechanisms) && mechanisms.length > 0) ||
      (Array.isArray(activities) && activities.length > 0)
    ) {
      result.push({
        id: 'targets',
        icon: '🎯',
        title: 'Explore Targets & Mechanisms',
        description: `${Array.isArray(mechanisms) ? mechanisms.length : 0} mechanisms, ${Array.isArray(activities) ? activities.length : 0} bioactivity records`,
        color: 'emerald',
        scrollTarget: 'bioactivity-targets',
      })
    }

    const routes = data.routes as unknown[]
    if (Array.isArray(routes) && routes.length > 0) {
      result.push({
        id: 'synthesis',
        icon: '🔬',
        title: 'Explore Synthesis Routes',
        description: `${routes.length} route${routes.length !== 1 ? 's' : ''} available for laboratory synthesis`,
        color: 'violet',
        scrollTarget: 'molecular-chemical',
      })
    }

    const patents = data.patents as unknown[]
    if (Array.isArray(patents) && patents.length > 0) {
      result.push({
        id: 'ip',
        icon: '📜',
        title: 'Review IP Landscape',
        description: `${patents.length} patent${patents.length !== 1 ? 's' : ''} — check freedom to operate`,
        color: 'amber',
        scrollTarget: 'research-literature',
      })
    }

    result.push({
      id: 'order',
      icon: '🛒',
      title: 'Order Compound',
      description: 'Open research catalog links & PubChem-linked suppliers for this molecule',
      color: 'cyan',
      scrollTarget: 'chemical-suppliers',
    })

    return result
  }, [data])

  const cas = useMemo(() => {
    const synonyms = data.synonyms as string[] | undefined
    const fromSyn = extractCasFromSynonyms(synonyms)
    if (fromSyn) return fromSyn
    if (typeof data.cas === 'string') return data.cas
    return null
  }, [data])

  const catalogLinks = useMemo(
    () => buildCatalogLinksFromVars({ name: moleculeName, cid, cas }),
    [moleculeName, cid, cas],
  )

  const inchiKey =
    typeof data.inchiKey === 'string'
      ? data.inchiKey
      : typeof (data as { molecule?: { inchiKey?: string } }).molecule?.inchiKey === 'string'
        ? (data as { molecule: { inchiKey: string } }).molecule.inchiKey
        : null

  const scrollRef = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const openOrder = useCallback(() => {
    setOrderOpen(true)
    logAgentActivity(
      'profile.order_compound.open',
      { moleculeName, cid: cid ?? null },
      { source: 'profile' },
    )
    // Prefer live PubChem vendors panel; fall back to local order panel
    requestAnimationFrame(() => {
      const vendors = document.getElementById('chemical-suppliers')
      if (vendors) {
        vendors.scrollIntoView({ behavior: 'smooth', block: 'start' })
        vendors.classList.add('ring-2', 'ring-cyan-400/50', 'ring-offset-2', 'ring-offset-[#0f1117]')
        window.setTimeout(() => {
          vendors.classList.remove('ring-2', 'ring-cyan-400/50', 'ring-offset-2', 'ring-offset-[#0f1117]')
        }, 2000)
      } else {
        document.getElementById('order-compound-panel')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    })
  }, [moleculeName, cid])

  const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    indigo: {
      bg: 'bg-indigo-900/20',
      border: 'border-indigo-700/40',
      text: 'text-indigo-300',
      hover: 'hover:border-indigo-500/60',
    },
    emerald: {
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-700/40',
      text: 'text-emerald-300',
      hover: 'hover:border-emerald-500/60',
    },
    violet: {
      bg: 'bg-violet-900/20',
      border: 'border-violet-700/40',
      text: 'text-violet-300',
      hover: 'hover:border-violet-500/60',
    },
    amber: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-700/40',
      text: 'text-amber-300',
      hover: 'hover:border-amber-500/60',
    },
    cyan: {
      bg: 'bg-cyan-900/20',
      border: 'border-cyan-700/40',
      text: 'text-cyan-300',
      hover: 'hover:border-cyan-500/60',
    },
  }

  return (
    <div className="mb-4" data-testid="next-steps-panel">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Next Steps
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {cards.map((card) => {
          const c = colorClasses[card.color] ?? colorClasses.indigo
          const content = (
            <>
              <span className="text-lg" aria-hidden>
                {card.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${c.text} truncate`}>{card.title}</p>
                <p className="text-[10px] text-slate-500 line-clamp-2">{card.description}</p>
              </div>
            </>
          )

          if (card.id === 'order') {
            return (
              <button
                key={card.id}
                type="button"
                onClick={openOrder}
                className={`flex w-56 flex-shrink-0 cursor-pointer items-start gap-2 rounded-lg border p-3 text-left transition-colors ${c.bg} ${c.border} ${c.hover} ${
                  orderOpen ? 'ring-1 ring-cyan-500/40' : ''
                }`}
                data-testid="order-compound-cta"
                aria-expanded={orderOpen}
                aria-controls="order-compound-panel"
              >
                {content}
              </button>
            )
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => card.scrollTarget && scrollRef(card.scrollTarget)}
              className={`flex w-52 flex-shrink-0 cursor-pointer items-start gap-2 rounded-lg border p-3 text-left transition-colors ${c.bg} ${c.border} ${c.hover}`}
            >
              {content}
            </button>
          )
        })}
      </div>

      {orderOpen && (
        <div
          id="order-compound-panel"
          className="mt-3 rounded-xl border border-cyan-800/40 bg-gradient-to-br from-cyan-950/30 to-slate-900/60 p-4"
          data-testid="order-compound-panel"
          role="region"
          aria-label="Order compound — research catalog links"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-cyan-200">
                Order / procure research material
              </h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Deep links open <strong className="font-medium text-slate-300">vendor search results</strong>{' '}
                for{' '}
                <span className="text-slate-200">{moleculeName}</span>
                {cas ? (
                  <>
                    {' '}
                    · CAS <span className="font-mono text-cyan-300/90">{cas}</span>
                  </>
                ) : null}
                {cid != null && cid > 0 ? (
                  <>
                    {' '}
                    · CID <span className="font-mono text-cyan-300/90">{cid}</span>
                  </>
                ) : null}
                . BioIntel does <strong className="text-slate-300">not</strong> place orders or quote
                prices — complete procurement on the vendor site under your lab&apos;s policies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOrderOpen(false)}
              className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>

          <div className="mb-3 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">
            <strong className="text-amber-200">Research use only.</strong> Not a pharmacy, not
            clinical dispensing, and not regulatory advice. Confirm identity (CID / InChIKey /
            CAS), grade, and purity with the supplier before purchase.
            {inchiKey ? (
              <span className="mt-1 block font-mono text-[9px] text-amber-300/70">
                InChIKey {inchiKey}
              </span>
            ) : null}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => scrollRef('chemical-suppliers')}
              className="rounded-lg border border-cyan-700/50 bg-cyan-900/30 px-3 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-900/50"
              data-testid="order-scroll-vendors"
            >
              Jump to Chemical Suppliers (PubChem xrefs) ↓
            </button>
            {cid != null && cid > 0 && (
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Chemical-Vendors`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-300 hover:border-cyan-700/40 hover:text-cyan-200"
              >
                PubChem Chemical Vendors section ↗
              </a>
            )}
          </div>

          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Quick catalog searches
          </p>
          <div className="flex flex-wrap gap-2">
            {catalogLinks.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.hint}
                onClick={() =>
                  logAgentActivity(
                    'profile.order_compound.catalog_click',
                    { vendor: s.name, moleculeName, cid: cid ?? null },
                    { source: 'profile' },
                  )
                }
                className="group inline-flex flex-col rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-3 py-2 transition-colors hover:border-cyan-600/50 hover:bg-cyan-900/30"
                data-testid={`order-catalog-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <span className="text-xs font-medium text-cyan-200 group-hover:text-cyan-100">
                  {s.name} ↗
                </span>
                <span className="text-[9px] text-slate-500">{s.hint}</span>
              </a>
            ))}
          </div>

          <p className="mt-3 text-[9px] leading-snug text-slate-600">
            Tip: After suppliers load below, prefer chips with direct molecule links from PubChem
            xrefs. Catalog buttons above always search by name
            {cid != null ? ' (use PubChem CID link to disambiguate salts/forms)' : ''}.
          </p>
        </div>
      )}
    </div>
  )
}

export function DiscoverBreadcrumb({
  disease,
  rank,
  score,
}: {
  disease: string
  rank: number
  score: number
}) {
  if (!disease || rank === 0) return null
  const scorePct = Math.round(score * 100)
  const confidenceLabel = scorePct >= 70 ? 'high' : scorePct >= 40 ? 'moderate' : 'preliminary'
  const confidenceColor =
    scorePct >= 70 ? 'text-emerald-400' : scorePct >= 40 ? 'text-amber-400' : 'text-slate-400'

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-700/30 bg-indigo-900/15 px-4 py-2.5">
      <span className="text-xs text-slate-400">Ranked</span>
      <span className="text-sm font-semibold text-indigo-300">#{rank}</span>
      <span className="text-xs text-slate-500">for</span>
      <span className="text-sm font-medium text-slate-200">{disease}</span>
      <span className={`text-xs font-medium ${confidenceColor}`}>
        ({scorePct}% match, {confidenceLabel} confidence)
      </span>
      <Link
        href={`/discover?q=${encodeURIComponent(disease)}`}
        className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
      >
        ← Back to results
      </Link>
    </div>
  )
}
