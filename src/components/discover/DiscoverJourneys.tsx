'use client'

import {
  mergeDiscoveryPreferences,
  saveDiscoveryPreferences,
  loadDiscoveryPreferences,
  type DiscoveryPreferences,
} from '@/lib/discovery/preferences'
import type { RubricPresetId } from '@/lib/domain/score'
import { emitProductEvent } from '@/lib/productEvents'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export interface JourneyDef {
  id: string
  label: string
  description: string
  disease: string
  rubricPreset: RubricPresetId
  harvestTiming: DiscoveryPreferences['harvestTiming']
  aeAggressiveness: DiscoveryPreferences['aeAggressiveness']
  rareDiseaseBoost?: boolean
}

export const DISCOVER_JOURNEYS: JourneyDef[] = [
  {
    id: 'repurpose-common',
    label: 'Repurposing (common disease)',
    description: 'Clinical-stage bias + deferred harvest — faster shortlist for known diseases.',
    disease: 'Type 2 diabetes',
    rubricPreset: 'repurposing',
    harvestTiming: 'board-promote',
    aeAggressiveness: 'soft-flag',
  },
  {
    id: 'rare-safety',
    label: 'Rare disease · safety-first',
    description: 'Safety-weighted rubric + rank-time harvest + Orphanet gene boost.',
    disease: 'Cystic fibrosis',
    rubricPreset: 'safety-first',
    harvestTiming: 'rank-time',
    aeAggressiveness: 'hard-penalty',
    rareDiseaseBoost: true,
  },
  {
    id: 'novel-bioactive',
    label: 'Novel bioactive explore',
    description: 'Efficacy + novelty up; clinical stage down — tool-compound style triage.',
    disease: 'Melanoma',
    rubricPreset: 'novel-bioactive',
    harvestTiming: 'board-promote',
    aeAggressiveness: 'soft-flag',
  },
]

interface Props {
  onRun: (disease: string) => void
  disabled?: boolean
}

/**
 * One-click journeys: stamp prefs then search a representative disease.
 */
export function DiscoverJourneys({ onRun, disabled }: Props) {
  function run(j: JourneyDef) {
    try {
      const cur = loadDiscoveryPreferences()
      const next = mergeDiscoveryPreferences(cur, {
        rubricPreset: j.rubricPreset,
        harvestTiming: j.harvestTiming,
        aeAggressiveness: j.aeAggressiveness,
        rareDiseaseBoost: j.rareDiseaseBoost ?? cur.rareDiseaseBoost,
        customWeights: undefined,
      })
      saveDiscoveryPreferences(next)
      emitProductEvent('preference_changed', {
        keys: 'journey',
        journey: j.id,
        rubricPreset: j.rubricPreset,
      })
    } catch {
      /* ignore */
    }
    onRun(j.disease)
  }

  return (
    <div className="mt-4 text-center" data-testid="discover-journeys">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
        <p className="text-[10px] uppercase tracking-wide text-slate-600">Guided journeys</p>
        <HelperTip
          content="Each journey sets rubric + harvest preferences, then ranks the disease. Descriptions on hover."
          label="About guided journeys"
          testId="discover-journeys-help"
        />
      </div>
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        {DISCOVER_JOURNEYS.map((j) => (
          <StyledTooltip key={j.id} content={j.description} className="max-w-[14rem]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => run(j)}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-center transition-colors hover:border-indigo-600/50 hover:bg-slate-800/50 disabled:opacity-40"
            >
              <span className="block text-[11px] font-medium text-slate-200">{j.label}</span>
            </button>
          </StyledTooltip>
        ))}
      </div>
    </div>
  )
}
