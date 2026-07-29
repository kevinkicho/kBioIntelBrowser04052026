/**
 * Shared helpers for molecule hub section builders.
 * Reduces repeated asArr/str/row patterns without changing of-record semantics.
 */

import { asArr, row, str } from './moleculeHubShared'
import type { DataHubRow } from './types'

export type HubRowSpec = Parameters<typeof row>[0]

/** Count rows from a data bag array field. */
export function countRow(
  data: Record<string, unknown>,
  key: string,
  spec: Omit<HubRowSpec, 'value'> & { valueFromCount?: boolean },
): DataHubRow {
  const n = asArr(data, key).length
  return row({
    ...spec,
    value: n > 0 ? String(n) : null,
  })
}

/** Sample string field from first array element. */
export function sampleFieldRow(
  data: Record<string, unknown>,
  arrayKey: string,
  field: string,
  spec: Omit<HubRowSpec, 'value'>,
): DataHubRow {
  const first = asArr(data, arrayKey)[0] as Record<string, unknown> | undefined
  return row({
    ...spec,
    value: first ? str(first[field]) : null,
  })
}

export { asArr, str, row }
