/**
 * Solo local campaign stage checkbox map (manual done).
 * Auto-done still comes from product events — see campaignStageProgress.
 */

import type { CampaignStageId } from './campaignWorkspace'

export const CAMPAIGN_DONE_KEY = 'biointel-campaign-done-v1'

export function loadCampaignDoneMap(): Record<string, CampaignStageId[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CAMPAIGN_DONE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return {}
    return o as Record<string, CampaignStageId[]>
  } catch {
    return {}
  }
}

export function saveCampaignDoneMap(map: Record<string, CampaignStageId[]>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CAMPAIGN_DONE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}
