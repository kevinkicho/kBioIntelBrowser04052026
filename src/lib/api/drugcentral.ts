/**
 * DrugCentral API Client (DEPRECATED - Using ROBOKOP Compatibility Layer)
 * 
 * This module now uses ROBOKOP (Reasoning Over Biomedical Objects linked in 
 * Knowledge Oriented Pathways) as the underlying data source.
 * 
 * ROBOKOP provides a comprehensive knowledge graph integrating multiple
 * biomedical data sources including DrugCentral data.
 * 
 * API: https://robokop-automat.apps.renci.org/
 * Docs: https://robokop.renci.org/developer-tools
 * 
 * @deprecated Consider using @/lib/api/robokop directly for new code
 */

import type { DrugCentralDrug, DrugCentralTarget } from '../types'
import { getRobokopAsDrugCentral } from './robokop'

export interface DrugCentralEnhanced {
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
  indications: string[]
  pharmacologicActions: string[]
  atcCodes: string[]
  manufacturers: string[]
  products: DrugCentralProduct[]
}

export interface DrugCentralProduct {
  id: number
  name: string
  form: string
  route: string
  marketingStartDate: string
}

/**
 * @deprecated Use getRobokopData from @/lib/api/robokop instead
 * Get comprehensive DrugCentral-compatible data for a drug
 * Now powered by ROBOKOP knowledge graph
 */
export async function getDrugCentralData(name: string): Promise<{
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
}> {
  return getRobokopAsDrugCentral(name)
}

/**
 * @deprecated Use getRobokopData from @/lib/api/robokop instead
 * Enhanced DrugCentral data (compatibility layer)
 * Returns ROBOKOP data mapped to DrugCentral format
 */
export async function getDrugCentralEnhanced(name: string): Promise<DrugCentralEnhanced | null> {
  const { drug, targets } = await getRobokopAsDrugCentral(name)
  
  if (!drug) return null

  return {
    drug,
    targets,
    indications: drug.indication,
    pharmacologicActions: drug.actionType,
    atcCodes: drug.atcCodes,
    manufacturers: [],
    products: [],
  }
}

/**
 * @deprecated Use getDrugsByTarget from @/lib/api/robokop instead
 * Search by target (compatibility layer)
 * Note: This is a stub for backwards compatibility
 */
export async function getDrugsByTarget(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  targetIdentifier: string
): Promise<DrugCentralDrug[]> {
  // Return empty array as this requires a different query pattern in ROBOKOP
  console.warn('getDrugsByTarget is deprecated. Use ROBOKOP query directly.')
  return []
}
