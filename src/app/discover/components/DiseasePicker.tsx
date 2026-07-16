'use client'

import type { DiseaseEntity } from '@/lib/domain/entities'

interface Props {
  query: string
  candidates: DiseaseEntity[]
  onSelect: (diseaseId: string, disease: DiseaseEntity) => void
  onCancel?: () => void
  isLoading?: boolean
}

/**
 * Multi-hit disease disambiguation (PR6b).
 * Shown when rank returns needsDiseaseConfirmation — never silent results[0].
 */
export function DiseasePicker({
  query,
  candidates,
  onSelect,
  onCancel,
  isLoading = false,
}: Props) {
  return (
    <div
      className="w-full max-w-2xl mx-auto mb-8"
      role="region"
      aria-label="Disease disambiguation"
      data-testid="disease-picker"
    >
      <div className="bg-slate-900/80 border border-indigo-500/40 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/90">
          <p className="text-sm font-semibold text-indigo-300">
            Multiple diseases match &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Confirm which disease to rank — we never pick the first hit silently.
          </p>
        </div>

        <ul className="max-h-96 overflow-y-auto divide-y divide-slate-800/80">
          {candidates.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onSelect(d.id, d)}
                className="w-full text-left px-5 py-3.5 hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`disease-option-${d.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-slate-100">{d.name}</span>
                    {d.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.description}</p>
                    )}
                    {d.therapeuticAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.therapeuticAreas.slice(0, 4).map((area) => (
                          <span
                            key={area}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-300 border border-indigo-800/40"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-cyan-400/80 shrink-0 mt-0.5">
                    {d.id}
                  </span>
                </div>
                {d.xrefs.length > 0 && (
                  <p className="text-[10px] text-slate-600 mt-1.5">
                    {d.xrefs.map((x) => `${x.system}: ${x.id}`).join(' · ')}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full text-center text-xs text-slate-500 py-3 hover:text-slate-300 border-t border-slate-700 disabled:opacity-40"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
