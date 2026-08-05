/**
 * Solo local “last campaign path” for resume (M8 return visits).
 * localStorage only — does not change of-record rank.
 */

import type { CampaignPersona } from './campaignWorkspace'
import type { GoldenPathId } from '@/lib/golden/goldenPaths'

export const LAST_CAMPAIGN_PATH_KEY = 'biointel-last-campaign-path-v1'

export interface LastCampaignPath {
  persona: CampaignPersona
  goldenPathId: GoldenPathId | string
  diseaseQuery: string
  targets: string[]
  discoverHref: string
  label: string
  savedAt: string
}

export function loadLastCampaignPath(): LastCampaignPath | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_CAMPAIGN_PATH_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as LastCampaignPath
    if (!o || typeof o !== 'object' || typeof o.discoverHref !== 'string') return null
    return o
  } catch {
    return null
  }
}

export function saveLastCampaignPath(path: Omit<LastCampaignPath, 'savedAt'>): LastCampaignPath {
  const full: LastCampaignPath = {
    ...path,
    savedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LAST_CAMPAIGN_PATH_KEY, JSON.stringify(full))
    } catch {
      /* quota */
    }
  }
  return full
}

export function clearLastCampaignPath(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(LAST_CAMPAIGN_PATH_KEY)
  } catch {
    /* ignore */
  }
}
