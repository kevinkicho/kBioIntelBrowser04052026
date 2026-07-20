/**
 * WHO Global Health Observatory context strip (server-friendly).
 * Epidemiology indicators only — not product authorization or clinical advice.
 */

import type { WhoGhoFact, WhoGhoIndicator } from '@/lib/api/whoGho'

export function WhoGhoContextStrip({
  diseaseName,
  indicators,
  facts,
}: {
  diseaseName: string
  indicators: WhoGhoIndicator[]
  facts: WhoGhoFact[]
}) {
  if (indicators.length === 0 && facts.length === 0) return null

  return (
    <section
      className="mb-6 rounded-xl border border-sky-900/40 bg-sky-950/20 p-4"
      data-testid="who-gho-context-strip"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/90">
            WHO Global Health Observatory
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Free public OData indicators related to “{diseaseName}” — population / disease
            burden context, not drug labels.
          </p>
        </div>
        <a
          href="https://www.who.int/data/gho"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-sky-400 hover:underline shrink-0"
        >
          GHO portal ↗
        </a>
      </div>

      {indicators.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-3">
          {indicators.slice(0, 8).map((ind) => (
            <li
              key={ind.code}
              className="rounded border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[10px] text-slate-300"
              title={ind.code}
            >
              {ind.name}
            </li>
          ))}
        </ul>
      )}

      {facts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="py-1 pr-2 font-medium">Region</th>
                <th className="py-1 pr-2 font-medium">Year</th>
                <th className="py-1 pr-2 font-medium">Dim</th>
                <th className="py-1 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {facts.slice(0, 12).map((f, i) => (
                <tr key={`${f.spatialDim}-${f.timeDim}-${i}`} className="border-b border-slate-800/60">
                  <td className="py-1 pr-2 text-slate-300 font-mono">{f.spatialDim || '—'}</td>
                  <td className="py-1 pr-2 text-slate-400">{f.timeDim || '—'}</td>
                  <td className="py-1 pr-2 text-slate-500">{f.dim1 || '—'}</td>
                  <td className="py-1 text-slate-200">
                    {f.value ||
                      (f.numericValue != null ? String(f.numericValue) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {facts[0]?.indicatorName && (
            <p className="mt-2 text-[10px] text-slate-600">
              Sample indicator: {facts[0].indicatorName} ({facts[0].indicatorCode})
            </p>
          )}
        </div>
      )}
    </section>
  )
}
