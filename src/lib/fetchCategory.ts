import type { CategoryId } from './categoryConfig'
import { clientFetch } from './clientFetch'

export type CategoryLoadState = 'idle' | 'loading' | 'loaded' | 'error'

export interface CategoryState {
  status: CategoryLoadState
  data: Record<string, unknown>
  error?: string
}

export async function fetchCategoryData(
  cid: number,
  categoryId: CategoryId
): Promise<Record<string, unknown>> {
  const res = await clientFetch(`/api/molecule/${cid}/category/${categoryId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${categoryId}: ${res.status}`)
  }
  return res.json()
}
