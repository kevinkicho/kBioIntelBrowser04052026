'use client'

import { useRef } from 'react'
import type { RubricPresetId, ScoreAxisWeights } from '@/lib/domain/score'
import { RUBRIC_PRESETS } from '@/lib/domain/score'
import type { AeAggressivenessPref } from '@/lib/discovery/preferences'
import {
  PREFERENCE_TOOLTIPS,
  RUBRIC_PRESET_LABELS,
} from '@/lib/discovery/preferences'
import { PrefTooltip } from '@/components/discovery/PrefTooltip'
import { emitProductEvent } from '@/lib/productEvents'

const AXIS_KEYS: (keyof ScoreAxisWeights)[] = [
  'efficacy',
  'clinicalStage',
  'safety',
  'novelty',
  'identityTrust',
]

const AXIS_LABELS: Record<keyof ScoreAxisWeights, string> = {
  efficacy: 'Efficacy',
  clinicalStage: 'Clinical stage',
  safety: 'Safety',
  novelty: 'Novelty',
  identityTrust: 'Identity trust',
}

export interface RubricEditorProps {
  preset: RubricPresetId
  aeAggressiveness: AeAggressivenessPref
  customWeights?: ScoreAxisWeights
  onPresetChange: (preset: RubricPresetId) => void
  onAeChange: (mode: AeAggressivenessPref) => void
  onWeightsChange: (weights: ScoreAxisWeights | undefined) => void
  compact?: boolean
}

export function RubricEditor({
  preset,
  aeAggressiveness,
  customWeights,
  onPresetChange,
  onAeChange,
  onWeightsChange,
  compact = false,
}: RubricEditorProps) {
  const weights = customWeights ?? RUBRIC_PRESETS[preset]
  const isCustom = !!customWeights
  const customWeightsEmitted = useRef(false)

  function handleSlider(key: keyof ScoreAxisWeights, value: number) {
    const next = { ...weights, [key]: value }
    onWeightsChange(next)
    // Once per custom-edit session to avoid slider spam (M4)
    if (!customWeightsEmitted.current) {
      customWeightsEmitted.current = true
      emitProductEvent('rubric_changed', { field: 'customWeights', axis: key })
    }
  }

  function handlePreset(p: RubricPresetId) {
    customWeightsEmitted.current = false
    onWeightsChange(undefined)
    onPresetChange(p)
    emitProductEvent('rubric_changed', { field: 'preset', preset: p })
  }

  function handleAe(mode: AeAggressivenessPref) {
    onAeChange(mode)
    emitProductEvent('rubric_changed', {
      field: 'aeAggressiveness',
      preset,
      value: mode,
    })
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <div className="flex items-center text-xs font-semibold text-slate-300 mb-2">
          Rubric preset
          <PrefTooltip
            eventKey="rubricPreset"
            text="How investigation-priority weights are distributed across axes. Changes re-rank candidates."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(RUBRIC_PRESET_LABELS) as RubricPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => handlePreset(id)}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                preset === id && !isCustom
                  ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-100'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="font-medium">{RUBRIC_PRESET_LABELS[id]}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                {PREFERENCE_TOOLTIPS.rubricPreset[id]}
              </span>
            </button>
          ))}
        </div>
        {isCustom && (
          <p className="text-[10px] text-amber-400/90 mt-2">
            Custom weights active — choose a preset to reset.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center text-xs font-semibold text-slate-300 mb-2">
          Axis weights {isCustom ? '(custom)' : `(${preset})`}
          <PrefTooltip
            eventKey="axisWeights"
            text="Sliders override the preset. Composite = weighted sum with missing-axis policy."
          />
        </div>
        <div className="space-y-2">
          {AXIS_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3 text-xs text-slate-400">
              <span className="w-28 shrink-0 text-slate-300">{AXIS_LABELS[key]}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round((weights[key] ?? 0) * 100)}
                onChange={(e) => handleSlider(key, Number(e.target.value) / 100)}
                className="flex-1 accent-indigo-500"
              />
              <span className="w-10 text-right tabular-nums text-slate-500">
                {Math.round((weights[key] ?? 0) * 100)}%
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center text-xs font-semibold text-slate-300 mb-2">
          Safety policy (AE aggressiveness)
          <PrefTooltip
            eventKey="aeAggressiveness"
            text={PREFERENCE_TOOLTIPS.aeAggressiveness[aeAggressiveness]}
          />
        </div>
        <div className="flex flex-col gap-2">
          {(
            [
              ['soft-flag', 'Soft flag (default)'],
              ['hard-penalty', 'Hard score penalty'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleAe(id)}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                aeAggressiveness === id
                  ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-100'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                {PREFERENCE_TOOLTIPS.aeAggressiveness[id]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
