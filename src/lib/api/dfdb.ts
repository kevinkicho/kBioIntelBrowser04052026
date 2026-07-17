import type { DFDBFlavonoid } from '../types'

/**
 * DFDB has no public REST API. Always empty — never invent flavonoid rows.
 * Kept so imports do not break; source is disabled in sourceAvailability.
 */
export async function searchDFDB(): Promise<DFDBFlavonoid[]> {
  return []
}
