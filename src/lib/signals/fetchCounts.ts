/**
 * Lightweight count fetch for project-board signal detection.
 * Pulls only categories that feed TRACKED_KEYS (reuses /api/molecule category routes).
 */

import { TRACKED_CATEGORY_IDS, extractTrackedCounts } from '@/lib/changeDetection'
import { clientFetch } from '@/lib/clientFetch'

export interface FetchCountsResult {
  cid: number
  counts: Record<string, number>
  /** Merged raw fields used by extractTrackedCounts / saveSnapshot */
  data: Record<string, unknown>
  ok: boolean
  error?: string
}

/**
 * Fetch tracked categories for a CID and extract array-length counts.
 * Failures on individual categories are skipped (partial counts still usable).
 */
export async function fetchTrackedCounts(cid: number): Promise<FetchCountsResult> {
  if (!Number.isFinite(cid) || cid <= 0) {
    return { cid, counts: {}, data: {}, ok: false, error: 'Invalid cid' }
  }

  const merged: Record<string, unknown> = {}
  let anyOk = false
  const errors: string[] = []

  await Promise.all(
    TRACKED_CATEGORY_IDS.map(async (categoryId) => {
      try {
        const res = await clientFetch(`/api/molecule/${cid}/category/${categoryId}`)
        if (!res.ok) {
          errors.push(`${categoryId}:${res.status}`)
          return
        }
        const json = (await res.json()) as Record<string, unknown>
        Object.assign(merged, json)
        anyOk = true
      } catch (err) {
        errors.push(`${categoryId}:${err instanceof Error ? err.message : 'error'}`)
      }
    }),
  )

  return {
    cid,
    counts: extractTrackedCounts(merged),
    data: merged,
    ok: anyOk,
    error: anyOk ? undefined : errors.join('; ') || 'No categories loaded',
  }
}
