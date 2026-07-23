'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_RESEARCH_VIEW_PREFS,
  loadResearchViewPrefs,
  patchResearchViewPrefs,
  resetResearchViewPrefs,
  RESEARCH_VIEW_PREFS_EVENT,
  type ResearchViewPrefs,
} from '@/lib/researchViewPrefs'

/**
 * Live research presentation prefs (solo localStorage).
 */
export function useResearchViewPrefs(): {
  prefs: ResearchViewPrefs
  patch: (p: Partial<ResearchViewPrefs>) => void
  reset: () => void
  hydrated: boolean
} {
  const [prefs, setPrefs] = useState<ResearchViewPrefs>(DEFAULT_RESEARCH_VIEW_PREFS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPrefs(loadResearchViewPrefs())
    setHydrated(true)
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d && typeof d === 'object') setPrefs(d as ResearchViewPrefs)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'biointel-research-view-prefs-v1') {
        setPrefs(loadResearchViewPrefs())
      }
    }
    window.addEventListener(RESEARCH_VIEW_PREFS_EVENT, onCustom)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(RESEARCH_VIEW_PREFS_EVENT, onCustom)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const patch = useCallback((p: Partial<ResearchViewPrefs>) => {
    setPrefs(patchResearchViewPrefs(p))
  }, [])

  const reset = useCallback(() => {
    setPrefs(resetResearchViewPrefs())
  }, [])

  return { prefs, patch, reset, hydrated }
}
