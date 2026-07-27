'use client'

import { useMemo } from 'react'
import { HelperTip } from '@/components/ui/HelperTip'
import { emptyDataClass } from '@/lib/summaryEmpty'

function asArr(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = data[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
}

function s(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function GrantLandscapeStrip({
  data,
  className = '',
  testId = 'grant-landscape',
  limit = 6,
}: {
  data: Record<string, unknown>
  className?: string
  testId?: string
  limit?: number
}) {
  const { institutes, years, samples } = useMemo(() => {
    const nih = asArr(data, 'nihGrants')
    const nsf = asArr(data, 'nsfAwards')
    const inst = new Map<string, number>()
    const yr = new Map<string, number>()
    for (const g of nih) {
      const i = s(g.institute) || 'NIH (unspecified)'
      inst.set(i, (inst.get(i) || 0) + 1)
      const y = s(g.startDate).slice(0, 4)
      if (y) yr.set(y, (yr.get(y) || 0) + 1)
    }
    for (const g of nsf) {
      const i = s(g.awardeeName) || s(g.institution) || 'NSF awardee'
      inst.set(i, (inst.get(i) || 0) + 1)
      const y = s(g.startDate).slice(0, 4) || s(g.year)
      if (y) yr.set(y, (yr.get(y) || 0) + 1)
    }
    const topInst = Array.from(inst.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
    const topYears = Array.from(yr.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
    const samples = [
      ...nih.slice(0, 3).map((g) => ({
        title: s(g.title).slice(0, 80),
        meta: [s(g.projectNumber), s(g.piName)].filter(Boolean).join(' · '),
        href: s(g.projectNumber)
          ? `https://reporter.nih.gov/search/${encodeURIComponent(s(g.projectNumber))}/projects`
          : undefined,
        source: 'NIH RePORTER',
      })),
      ...nsf.slice(0, 2).map((g) => ({
        title: s(g.title).slice(0, 80),
        meta: s(g.awardNumber) || s(g.id),
        href: s(g.url) || undefined,
        source: 'NSF Awards',
      })),
    ]
    return { institutes: topInst, years: topYears, samples }
  }, [data, limit])

  const empty = institutes.length === 0 && samples.length === 0
  if (empty) return null

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-3 ${className} ${emptyDataClass(empty)}`}
      data-testid={testId}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <h3 className="text-xs font-semibold text-slate-100">Grant landscape</h3>
        <HelperTip
          content="NIH RePORTER + NSF award samples loaded this session. Affiliation / funding context only — not efficacy claims."
          label="About grant landscape"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {institutes.map(([name, n]) => (
          <span
            key={name}
            className="rounded-full border border-violet-900/40 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
          >
            {name.slice(0, 36)} · {n}
          </span>
        ))}
      </div>
      {years.length > 0 && (
        <p className="mb-2 text-[10px] text-slate-500">
          Years:{' '}
          {years.map(([y, n]) => `${y}(${n})`).join(' · ')}
        </p>
      )}
      <ul className="space-y-1">
        {samples.map((s, i) => (
          <li key={i} className="text-[11px] text-slate-300">
            {s.href ? (
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 hover:underline"
              >
                {s.title || 'Award'}
              </a>
            ) : (
              <span>{s.title || 'Award'}</span>
            )}
            <span className="text-slate-600">
              {' '}
              · {s.source}
              {s.meta ? ` · ${s.meta}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
