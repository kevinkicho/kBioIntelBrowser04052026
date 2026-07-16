'use client'

import { useEffect } from 'react'
import type {
  CollaborationModePref,
  DiscoveryPreferences,
  HarvestTimingPref,
  TourExampleSetPref,
} from '@/lib/discovery/preferences'
import { PREFERENCE_TOOLTIPS } from '@/lib/discovery/preferences'
import type { RubricPresetId, ScoreAxisWeights } from '@/lib/domain/score'
import type { AeAggressivenessPref } from '@/lib/discovery/preferences'
import { RubricEditor } from '@/app/discover/components/RubricEditor'

export interface DiscoverySettingsDrawerProps {
  open: boolean
  onClose: () => void
  prefs: DiscoveryPreferences
  onChange: (patch: Partial<Omit<DiscoveryPreferences, 'version'>>) => void
  onReset: () => void
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex ml-1 align-middle">
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600 text-[9px] text-slate-400 cursor-help"
        tabIndex={0}
        aria-label="More info"
      >
        ?
      </span>
      <span className="pointer-events-none absolute z-50 right-0 top-5 w-64 rounded-lg border border-slate-700 bg-slate-900 p-2 text-[11px] leading-snug text-slate-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  )
}

export function DiscoverySettingsDrawer({
  open,
  onClose,
  prefs,
  onChange,
  onReset,
}: DiscoverySettingsDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Discovery preferences"
        className="relative w-full max-w-md h-full bg-[#0f1117] border-l border-slate-700/60 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Discovery preferences</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sticky defaults for ranking, safety, and harvest timing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <RubricEditor
            preset={prefs.rubricPreset}
            aeAggressiveness={prefs.aeAggressiveness}
            customWeights={prefs.customWeights}
            onPresetChange={(rubricPreset: RubricPresetId) => onChange({ rubricPreset })}
            onAeChange={(aeAggressiveness: AeAggressivenessPref) =>
              onChange({ aeAggressiveness })
            }
            onWeightsChange={(customWeights: ScoreAxisWeights | undefined) =>
              onChange(
                customWeights
                  ? { customWeights }
                  : { customWeights: undefined },
              )
            }
          />

          <div>
            <div className="flex items-center text-xs font-semibold text-slate-300 mb-2">
              Harvest timing
              <Tooltip text={PREFERENCE_TOOLTIPS.harvestTiming[prefs.harvestTiming]} />
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['board-promote', 'Board / promote-time (default)'],
                  ['rank-time', 'Always rank-time (top-15)'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ harvestTiming: id as HarvestTimingPref })}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    prefs.harvestTiming === id
                      ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-100'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {PREFERENCE_TOOLTIPS.harvestTiming[id]}
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.harvestTimingSticky}
                onChange={(e) => onChange({ harvestTimingSticky: e.target.checked })}
                className="rounded border-slate-600 accent-indigo-500"
              />
              Remember harvest timing across sessions
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center text-xs font-semibold text-slate-300">
              Collaboration
              <Tooltip
                text={
                  PREFERENCE_TOOLTIPS.collaborationMode?.[prefs.collaborationMode] ??
                  'Solo export always works. Share links require enabling this mode (PR18).'
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['solo-export', 'Solo + file export (default)'],
                  ['share-links-when-available', 'Share links when available'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChange({ collaborationMode: id as CollaborationModePref })
                  }
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    prefs.collaborationMode === id
                      ? 'border-indigo-500/60 bg-indigo-900/40 text-indigo-100'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center text-xs font-semibold text-slate-300">
              Rare-disease boost (Orphanet)
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={prefs.rareDiseaseBoost}
                onChange={(e) => onChange({ rareDiseaseBoost: e.target.checked })}
                className="mt-0.5 rounded border-slate-600 accent-indigo-500"
              />
              <span>
                After ranking, fetch Orphanet gene associations for the disease name and merge into
                pinned targets (max 10). Free Orphadata only; no effect when no Orphanet hit.
              </span>
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center text-xs font-semibold text-slate-300">
              Guided tour examples
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['mixed', 'Mixed (default)'],
                  ['common-only', 'Common diseases only'],
                  ['rare-only', 'Rare / long-tail only'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ tourExampleSet: id as TourExampleSetPref })}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    prefs.tourExampleSet === id
                      ? 'border-indigo-500/60 bg-indigo-900/40 text-indigo-100'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] leading-relaxed text-slate-500">
            Empty AE data is never scored as “safe.” Soft-flag mode clamps safety for high
            clinical-stage drugs and surfaces FAERS as badges. Rank-time harvest adds ~8–12s for
            top-15 safety + novelty. Share pack uses content-hashed 30-day snapshots when
            collaboration mode allows.
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  )
}
