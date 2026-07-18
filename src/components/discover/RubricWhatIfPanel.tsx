'use client'

import { useMemo, useState } from 'react'
import {
  RUBRIC_PRESETS,
  type RubricPresetId,
  type ScoreAxisWeights,
  type ScoreRubric,
} from '@/lib/domain/score'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { MoleculeCandidate } from '@/lib/domain/entities'
import { rerankCandidatesClient } from '@/lib/discovery/clientRerank'
import { RUBRIC_PRESET_LABELS } from '@/lib/discovery/preferences'

const AXIS_KEYS: (keyof ScoreAxisWeights)[] = [
  'efficacy',
  'clinicalStage',
  'safety',
  'novelty',
  'identityTrust',
]

const AXIS_LABELS: Record<keyof ScoreAxisWeights, string> = {
  efficacy: 'Efficacy',
  clinicalStage: 'Clinical',
  safety: 'Safety',
  novelty: 'Novelty',
  identityTrust: 'Identity',
}

interface Props {
  candidates: CandidateMolecule[]
  domainCandidates?: MoleculeCandidate[]
  baseRubric?: ScoreRubric
}

/**
 * Client-side what-if re-rank — no network, no LLM.
 */
export function RubricWhatIfPanel({ candidates, domainCandidates, baseRubric }: Props) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<RubricPresetId>(baseRubric?.preset ?? 'balanced')
  const [weights, setWeights] = useState<ScoreAxisWeights>(
    () => baseRubric?.weights ?? { ...RUBRIC_PRESETS.balanced },
  )

  const rows = useMemo(() => {
    if (!open || candidates.length === 0) return []
    return rerankCandidatesClient(candidates, domainCandidates, {
      weights,
      missingAxisPolicy: baseRubric?.missingAxisPolicy ?? 'renormalize',
      penalizeValue: baseRubric?.penalizeValue,
      preset,
    })
  }, [open, candidates, domainCandidates, weights, baseRubric, preset])

  function applyPreset(p: RubricPresetId) {
    setPreset(p)
    setWeights({ ...RUBRIC_PRESETS[p] })
  }

  return (
    <div
      className="mb-4 rounded-xl border border-indigo-900/40 bg-indigo-950/20"
      data-testid="rubric-what-if"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span>
          <span className="text-[12px] font-semibold text-indigo-200">What-if re-rank</span>
          <span className="ml-2 text-[10px] text-slate-500">
            Reweight axes client-side — does not re-query APIs or use AI
          </span>
        </span>
        <span className="text-slate-500 text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-indigo-900/30 px-3 pb-3 pt-2 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RUBRIC_PRESETS) as RubricPresetId[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-full border px-2.5 py-1 text-[10px] ${
                  preset === p
                    ? 'border-indigo-500/60 bg-indigo-900/40 text-indigo-100'
                    : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {RUBRIC_PRESET_LABELS[p] ?? p}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {AXIS_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-16 shrink-0">{AXIS_LABELS[k]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(weights[k] * 100)}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [k]: Number(e.target.value) / 100 }))
                  }
                  className="flex-1 accent-indigo-500"
                />
                <span className="w-8 text-right font-mono tabular-nums text-slate-500">
                  {weights[k].toFixed(2)}
                </span>
              </label>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="px-2 py-1.5 text-left font-medium">#</th>
                  <th className="px-2 py-1.5 text-left font-medium">Candidate</th>
                  <th className="px-2 py-1.5 text-right font-medium">Was</th>
                  <th className="px-2 py-1.5 text-right font-medium">Now</th>
                  <th className="px-2 py-1.5 text-right font-medium">Δ rank</th>
                  <th className="px-2 py-1.5 text-right font-medium">Δ score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-slate-800/60">
                    <td className="px-2 py-1 text-slate-500 tabular-nums">{r.newRank}</td>
                    <td className="px-2 py-1 text-slate-200 truncate max-w-[10rem]">{r.name}</td>
                    <td className="px-2 py-1 text-right text-slate-600 tabular-nums">
                      {r.originalRank}
                    </td>
                    <td className="px-2 py-1 text-right text-slate-300 tabular-nums">
                      {(r.newComposite * 100).toFixed(0)}%
                    </td>
                    <td
                      className={`px-2 py-1 text-right tabular-nums font-medium ${
                        r.rankDelta > 0
                          ? 'text-emerald-400'
                          : r.rankDelta < 0
                            ? 'text-rose-400'
                            : 'text-slate-600'
                      }`}
                    >
                      {r.rankDelta > 0 ? `↑${r.rankDelta}` : r.rankDelta < 0 ? `↓${-r.rankDelta}` : '—'}
                    </td>
                    <td
                      className={`px-2 py-1 text-right tabular-nums ${
                        r.compositeDelta > 0.005
                          ? 'text-emerald-400/90'
                          : r.compositeDelta < -0.005
                            ? 'text-rose-400/90'
                            : 'text-slate-600'
                      }`}
                    >
                      {r.compositeDelta > 0.005
                        ? `+${(r.compositeDelta * 100).toFixed(0)}`
                        : r.compositeDelta < -0.005
                          ? `${(r.compositeDelta * 100).toFixed(0)}`
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
