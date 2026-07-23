'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadDiscoveryPreferences,
  updateDiscoveryPreferences,
  PREFERENCE_TOOLTIPS,
  TOUR_EXAMPLE_SET_LABELS,
  type TourExampleSetPref,
} from '@/lib/discovery/preferences'
import { examplesForTourSet } from '@/lib/discovery/tourExamples'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const STORAGE_KEY = 'guided-tour-dismissed'

const TOUR_SET_OPTIONS: TourExampleSetPref[] = ['mixed', 'common-only', 'rare-only']

/**
 * Homepage first-run tour: disease examples from tourExampleSet preference.
 * Visible when search mode is Disease (homepage default). Gear saves preference.
 * Descriptions live in tooltips — only titles/labels stay on the card.
 */
export function GuidedTour({ searchType }: { searchType: string }) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [tourSet, setTourSet] = useState<TourExampleSetPref>('mixed')
  const [gearOpen, setGearOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    setTourSet(loadDiscoveryPreferences().tourExampleSet)
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEY, '1')
  }, [])

  const handleTourSetChange = useCallback((next: TourExampleSetPref) => {
    setTourSet(next)
    updateDiscoveryPreferences({ tourExampleSet: next })
    window.dispatchEvent(new Event('biointel-prefs-changed'))
    setGearOpen(false)
  }, [])

  if (!mounted || dismissed || searchType !== 'disease') return null

  const examples = examplesForTourSet(tourSet)

  return (
    <div className="w-full max-w-2xl mt-6 bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            New here? Try a disease example
          </p>
          <HelperTip
            content="Public data only — start from a disease to browse related targets and candidates. Rankings and packs are triage aids, not clinical advice."
            label="About disease examples"
            testId="guided-tour-help"
          />
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <StyledTooltip content={PREFERENCE_TOOLTIPS.tourExampleSet[tourSet]}>
              <button
                type="button"
                onClick={() => setGearOpen((o) => !o)}
                aria-label="Example set settings"
                aria-expanded={gearOpen}
                className="text-slate-500 hover:text-slate-300 text-sm leading-none px-1.5 py-0.5 rounded"
              >
                ⚙
              </button>
            </StyledTooltip>
            {gearOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-slate-600 bg-slate-900 shadow-xl py-1"
              >
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                  Example set
                </p>
                {TOUR_SET_OPTIONS.map((opt) => (
                  <StyledTooltip
                    key={opt}
                    content={PREFERENCE_TOOLTIPS.tourExampleSet[opt]}
                    className="w-full"
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={tourSet === opt}
                      onClick={() => handleTourSetChange(opt)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        tourSet === opt
                          ? 'bg-indigo-900/40 text-indigo-200'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-medium">{TOUR_EXAMPLE_SET_LABELS[opt]}</span>
                      {opt === 'mixed' && (
                        <span className="ml-1 text-[10px] text-slate-500">(default)</span>
                      )}
                    </button>
                  </StyledTooltip>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss tour"
            className="text-slate-600 hover:text-slate-400 text-sm leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {examples.map((ex) => (
          <StyledTooltip key={`${tourSet}-${ex.query}`} content={ex.hook} className="w-full">
            <a
              href={`/disease?q=${encodeURIComponent(ex.query)}`}
              className="group block bg-slate-900/40 border border-slate-700/60 hover:border-indigo-700/60 hover:bg-slate-900/60 rounded-lg px-3 py-2 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                {ex.name}
              </p>
            </a>
          </StyledTooltip>
        ))}
      </div>
    </div>
  )
}
