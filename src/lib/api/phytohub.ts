import type { PhytoHubCompound } from '../types'

/**
 * PhytoHub has no public REST API. Always empty — never invent phytochemical rows.
 * Kept so imports do not break; source is disabled in sourceAvailability.
 */
export async function searchPhytoHub(): Promise<PhytoHubCompound[]> {
  return []
}
