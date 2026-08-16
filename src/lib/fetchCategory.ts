/**
 * Profile category fetch — L1/L2 cache then network with staged reliability.
 */

import type { CategoryId } from './categoryConfig'
import { clientFetch } from './clientFetch'
import type { ApiIdentifierType, ApiParamValue } from './apiIdentifiers'
import {
  getProfileClientCache,
  getProfileClientCacheAsync,
  profileCacheKey,
  setProfileClientCache,
} from './profileClientCache'
import { logAgentActivity } from './agentActivityLog'
import { newPipelineRun, runStage } from './pipeline'
import type { PipelineReport } from './pipeline'
import { withCategorySlot } from './pipeline/categoryFetchScheduler'
import { underResourcePressure } from './requestProtocol'
import { shouldCacheHonestyEnvelope } from './honestyEnvelope'

/** Same row test as the category route — underscore keys are not payload. */
export function categoryHasPanelPayload(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false
  return Object.keys(data)
    .filter((k) => !k.startsWith('_'))
    .some((k) => {
      const v = data[k]
      if (v == null) return false
      if (Array.isArray(v)) return v.length > 0
      if (typeof v === 'object') return Object.keys(v as object).length > 0
      return true
    })
}

function isReusableCategoryCache(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const rec = data as Record<string, unknown>
  return shouldCacheHonestyEnvelope(rec) && categoryHasPanelPayload(rec)
}

export type CategoryLoadState = 'idle' | 'loading' | 'loaded' | 'error'

export interface CategoryState {
  status: CategoryLoadState
  data: Record<string, unknown>
  error?: string
}

function categoryCacheExtra(
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
): string {
  const o =
    apiOverrides && Object.keys(apiOverrides).length > 0
      ? JSON.stringify(apiOverrides)
      : ''
  let p = ''
  if (apiParams) {
    const filtered: Record<string, ApiParamValue> = {}
    for (const [k, v] of Object.entries(apiParams)) {
      if (Object.keys(v).length > 0) filtered[k] = v
    }
    if (Object.keys(filtered).length > 0) p = JSON.stringify(filtered)
  }
  return `${categoryId}|${o}|${p}`
}

export function categoryProfileCacheKey(
  cid: number,
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
): string {
  return profileCacheKey('category', cid, categoryCacheExtra(categoryId, apiOverrides, apiParams))
}

/** Sync L1 peek — avoids loading flash when memory already has data. */
export function peekCategoryClientCache(
  cid: number,
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
): Record<string, unknown> | undefined {
  const hit = getProfileClientCache<Record<string, unknown>>(
    categoryProfileCacheKey(cid, categoryId, apiOverrides, apiParams),
  )
  // Skip leftover empty/timeout shells so they cannot pin as success.
  return isReusableCategoryCache(hit) ? hit : undefined
}

export interface FetchCategoryResult {
  data: Record<string, unknown>
  pipeline: PipelineReport
  fromCache: boolean
}

/**
 * Fetch one profile category with staged reliability:
 * cache_lookup → (optional delay under pressure) → network → stamp_cache
 */
export async function fetchCategoryData(
  cid: number,
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
  opts?: { refresh?: boolean; signal?: AbortSignal; returnPipeline?: boolean },
): Promise<Record<string, unknown>> {
  const out = await fetchCategoryDataDetailed(cid, categoryId, apiOverrides, apiParams, opts)
  return out.data
}

/** Same as fetchCategoryData but includes pipeline report (tests / telemetry). */
export async function fetchCategoryDataDetailed(
  cid: number,
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
  opts?: { refresh?: boolean; signal?: AbortSignal },
): Promise<FetchCategoryResult> {
  const cacheKey = categoryProfileCacheKey(cid, categoryId, apiOverrides, apiParams)
  const run = newPipelineRun(`category:${categoryId}`)
  const signal = opts?.signal

  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Aborted', 'AbortError')
  }

  // --- cache ---
  if (!opts?.refresh) {
    const { value: cached, stage } = await runStage(
      { id: 'cache_lookup', timeoutMs: 3_000, optional: true, signal },
      async () => {
        const hit = await getProfileClientCacheAsync<Record<string, unknown>>(cacheKey)
        return hit ?? null
      },
    )
    run.addStage(stage)
    if (isReusableCategoryCache(cached)) {
      logAgentActivity(
        'profile.cache.hit',
        { cid, categoryId, layer: 'l1_or_l2' },
        { source: 'profile' },
      )
      return {
        data: { ...cached, _fromClientCache: true },
        pipeline: run.finish(true, false),
        fromCache: true,
      }
    }
    logAgentActivity('profile.cache.miss', { cid, categoryId }, { source: 'profile' })
  } else {
    run.addStage({
      id: 'cache_lookup',
      status: 'skipped',
      ms: 0,
      notes: ['refresh — cache bypassed'],
    })
  }

  // Yield sockets when browser is under resource pressure
  if (underResourcePressure()) {
    run.report.warnings.push('resource pressure — brief delay before category network')
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400))
  }

  let url = `/api/molecule/${cid}/category/${categoryId}`
  const params = new URLSearchParams()
  if (apiOverrides && Object.keys(apiOverrides).length > 0) {
    params.set('overrides', JSON.stringify(apiOverrides))
  }
  if (apiParams) {
    const filtered: Record<string, ApiParamValue> = {}
    for (const [k, v] of Object.entries(apiParams)) {
      if (Object.keys(v).length > 0) filtered[k] = v
    }
    if (Object.keys(filtered).length > 0) {
      params.set('params', JSON.stringify(filtered))
    }
  }
  if (opts?.refresh) {
    params.set('refresh', '1')
    params.set('_t', String(Date.now()))
  }
  const qs = params.toString()
  if (qs) url += `?${qs}`

  // Category network is stampede-controlled (max 3 concurrent profile categories)
  const { value: raw, stage: netStage } = await runStage(
    {
      id: 'network_category',
      timeoutMs: 95_000,
      retries: 2,
      retryDelayMs: 600,
      signal,
    },
    async () =>
      withCategorySlot(
        async () => {
          const res = await clientFetch(
            url,
            signal ? { signal } : undefined,
            {
              retries: 3,
              retryDelayMs: 600,
              retryStatuses: [404, 408, 429, 500, 502, 503, 504],
              timeoutMs: 90_000,
            },
          )
          if (!res.ok) {
            throw new Error(`Failed to fetch ${categoryId}: ${res.status}`)
          }
          return (await res.json()) as Record<string, unknown>
        },
        { signal, timeoutMs: 120_000 },
      ),
  )
  run.addStage(netStage)

  if (!raw) {
    const e = new Error(netStage.error || `Failed to fetch ${categoryId}`)
    ;(e as Error & { pipeline?: PipelineReport }).pipeline = run.finish(false, false)
    throw e
  }

  const data: Record<string, unknown> = {
    ...raw,
    _clientFetchedAt: new Date().toISOString(),
    _fromClientCache: false,
  }

  const { stage: storeStage } = await runStage(
    { id: 'cache_store', timeoutMs: 2_000, optional: true, signal },
    async () => {
      // Empty-as-success / timeout / error must not pin as a revisit success shell.
      if (isReusableCategoryCache(data)) {
        setProfileClientCache(cacheKey, data)
      }
      return true
    },
  )
  run.addStage(storeStage)

  return {
    data,
    pipeline: run.finish(true, storeStage.status !== 'ok'),
    fromCache: false,
  }
}
