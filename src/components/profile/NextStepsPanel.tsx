'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface ActionCard {
  icon: string
  title: string
  description: string
  href?: string
  onClick?: () => void
  color: string
}

interface Props {
  moleculeName: string
  data: Record<string, unknown>
}

export function NextStepsPanel({ moleculeName, data }: Props) {
  const cards = useMemo(() => {
    const result: ActionCard[] = []

    const trials = data.clinicalTrials as unknown[]
    if (Array.isArray(trials) && trials.length > 0) {
      result.push({
        icon: '🏥',
        title: 'Review Clinical Evidence',
        description: `${trials.length} clinical trial${trials.length !== 1 ? 's' : ''} — examine phases, statuses, and outcomes`,
        color: 'indigo',
      })
    }

    const mechanisms = data.chemblMechanisms as unknown[]
    const activities = data.chemblActivities as unknown[]
    if (Array.isArray(mechanisms) && mechanisms.length > 0 || Array.isArray(activities) && activities.length > 0) {
      result.push({
        icon: '🎯',
        title: 'Explore Targets & Mechanisms',
        description: `${Array.isArray(mechanisms) ? mechanisms.length : 0} mechanisms, ${Array.isArray(activities) ? activities.length : 0} bioactivity records`,
        color: 'emerald',
      })
    }

    const routes = data.routes as unknown[]
    if (Array.isArray(routes) && routes.length > 0) {
      result.push({
        icon: '🔬',
        title: 'Explore Synthesis Routes',
        description: `${routes.length} route${routes.length !== 1 ? 's' : ''} available for laboratory synthesis`,
        color: 'violet',
      })
    }

    const patents = data.patents as unknown[]
    if (Array.isArray(patents) && patents.length > 0) {
      result.push({
        icon: '📜',
        title: 'Review IP Landscape',
        description: `${patents.length} patent${patents.length !== 1 ? 's' : ''} — check freedom to operate`,
        color: 'amber',
      })
    }

    result.push({
      icon: '🛒',
      title: 'Order Compound',
      description: 'Search suppliers for purchasing or research-grade material',
      href: `#suppliers`,
      color: 'cyan',
    })

    return result
  }, [data])

  const suppliers = useMemo(() => {
    const name = encodeURIComponent(moleculeName)
    return [
      { name: 'Sigma-Aldrich', url: `https://www.sigmaaldrich.com/US/en/search/${name}?focus=products` },
      { name: 'TCI Chemicals', url: `https://www.tcichemicals.com/US/en/search/?q=${name}` },
      { name: 'Fisher Scientific', url: `https://www.fishersci.com/us/en/search/${name}` },
    ]
  }, [moleculeName])

  const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    indigo: { bg: 'bg-indigo-900/20', border: 'border-indigo-700/40', text: 'text-indigo-300', hover: 'hover:border-indigo-500/60' },
    emerald: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', text: 'text-emerald-300', hover: 'hover:border-emerald-500/60' },
    violet: { bg: 'bg-violet-900/20', border: 'border-violet-700/40', text: 'text-violet-300', hover: 'hover:border-violet-500/60' },
    amber: { bg: 'bg-amber-900/20', border: 'border-amber-700/40', text: 'text-amber-300', hover: 'hover:border-amber-500/60' },
    cyan: { bg: 'bg-cyan-900/20', border: 'border-cyan-700/40', text: 'text-cyan-300', hover: 'hover:border-cyan-500/60' },
  }

  const scrollRef = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Next Steps</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {cards.map((card) => {
          const c = colorClasses[card.color] ?? colorClasses.indigo
          const content = (
            <>
              <span className="text-lg">{card.icon}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${c.text} truncate`}>{card.title}</p>
                <p className="text-[10px] text-slate-500 line-clamp-2">{card.description}</p>
              </div>
            </>
          )

          if (card.title === 'Review Clinical Evidence') {
            return (
              <button
                key={card.title}
                onClick={() => scrollRef('clinical-safety')}
                className={`flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors text-left w-52 cursor-pointer`}
              >
                {content}
              </button>
            )
          }

          if (card.title === 'Explore Targets & Mechanisms') {
            return (
              <button
                key={card.title}
                onClick={() => scrollRef('bioactivity-targets')}
                className={`flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors text-left w-52 cursor-pointer`}
              >
                {content}
              </button>
            )
          }

          if (card.title === 'Explore Synthesis Routes') {
            return (
              <button
                key={card.title}
                onClick={() => scrollRef('molecular-chemical')}
                className={`flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors text-left w-52 cursor-pointer`}
              >
                {content}
              </button>
            )
          }

          if (card.title === 'Review IP Landscape') {
            return (
              <button
                key={card.title}
                onClick={() => scrollRef('research-literature')}
                className={`flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors text-left w-52 cursor-pointer`}
              >
                {content}
              </button>
            )
          }

          return (
            <div
              key={card.title}
              id="suppliers"
              className={`flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors w-52`}
            >
              {content}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {suppliers.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded bg-slate-800/50 text-slate-400 border border-slate-700/40 hover:text-cyan-300 hover:border-cyan-700/50 transition-colors"
          >
            {s.name} ↗
          </a>
        ))}
      </div>
    </div>
  )
}

export function DiscoverBreadcrumb({ disease, rank, score }: { disease: string; rank: number; score: number }) {
  if (!disease || rank === 0) return null
  const scorePct = Math.round(score * 100)
  const confidenceLabel = scorePct >= 70 ? 'high' : scorePct >= 40 ? 'moderate' : 'preliminary'
  const confidenceColor = scorePct >= 70 ? 'text-emerald-400' : scorePct >= 40 ? 'text-amber-400' : 'text-slate-400'

  return (
    <div className="mb-4 bg-indigo-900/15 border border-indigo-700/30 rounded-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-slate-400">Ranked</span>
      <span className="text-sm font-semibold text-indigo-300">#{rank}</span>
      <span className="text-xs text-slate-500">for</span>
      <span className="text-sm font-medium text-slate-200">{disease}</span>
      <span className={`text-xs font-medium ${confidenceColor}`}>({scorePct}% match, {confidenceLabel} confidence)</span>
      <Link
        href={`/discover?q=${encodeURIComponent(disease)}`}
        className="ml-auto text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
      >
        ← Back to results
      </Link>
    </div>
  )
}