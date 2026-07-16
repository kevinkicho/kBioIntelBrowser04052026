export type DataLoadStatus = 'loaded' | 'empty' | 'error' | 'timeout' | 'disabled'

export interface SectionStatus {
  status: DataLoadStatus
  error?: string
}

/** Per-source status attached to category API responses */
export interface SourceFetchStatus {
  source: string
  status: DataLoadStatus
  duration_ms?: number
  error?: string
  has_data: boolean
}

export interface TaggedResult<T> {
  data: T
  status: SectionStatus
}

export function tagResult<T>(val: T, isEmpty: (v: T) => boolean): TaggedResult<T> {
  return {
    data: val,
    status: { status: isEmpty(val) ? 'empty' : 'loaded' },
  }
}

export function tagError<T>(fallback: T, error: string): TaggedResult<T> {
  return {
    data: fallback,
    status: { status: 'error', error },
  }
}

export function isEmptyArray(val: unknown): boolean {
  return Array.isArray(val) ? val.length === 0 : val == null
}

export function emptyMessageForStatus(status: DataLoadStatus | undefined, fallback: string): string {
  switch (status) {
    case 'timeout':
      return 'Source timed out — data may still exist. Try again later.'
    case 'error':
      return 'Unable to load from this source (network or API error).'
    case 'disabled':
      return 'This source is currently disabled (endpoint unavailable).'
    case 'empty':
      return fallback
    default:
      return fallback
  }
}
