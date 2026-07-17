import type { CategoryId } from './categoryConfig'
import { clientFetch } from './clientFetch'
import type { ApiIdentifierType, ApiParamValue } from './apiIdentifiers'
import {
  getProfileClientCache,
  getProfileClientCacheAsync,
  profileCacheKey,
  setProfileClientCache,
} from './profileClientCache'

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
  const o = apiOverrides && Object.keys(apiOverrides).length > 0
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
  return getProfileClientCache<Record<string, unknown>>(
    categoryProfileCacheKey(cid, categoryId, apiOverrides, apiParams),
  )
}

export async function fetchCategoryData(
  cid: number,
  categoryId: CategoryId,
  apiOverrides?: Record<string, ApiIdentifierType>,
  apiParams?: Record<string, ApiParamValue>,
  opts?: { refresh?: boolean },
): Promise<Record<string, unknown>> {
  const cacheKey = categoryProfileCacheKey(cid, categoryId, apiOverrides, apiParams)

  // History / SPA / hard-reload: L1 memory then L2 IDB without network.
  if (!opts?.refresh) {
    const cached = await getProfileClientCacheAsync<Record<string, unknown>>(cacheKey)
    if (cached) return cached
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
  }
  const qs = params.toString()
  if (qs) url += `?${qs}`

  // Retries cover Fast Refresh route races (transient 404) and PubChem 502s.
  const res = await clientFetch(url, undefined, { retries: 2, retryDelayMs: 400 })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${categoryId}: ${res.status}`)
  }
  const data = (await res.json()) as Record<string, unknown>
  setProfileClientCache(cacheKey, data)
  return data
}
