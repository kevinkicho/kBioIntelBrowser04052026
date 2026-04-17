export type DataLoadStatus = 'loaded' | 'empty' | 'error'

export interface SectionStatus {
  status: DataLoadStatus
  error?: string
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