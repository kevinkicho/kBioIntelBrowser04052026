/**
 * Phytochemical lookups via free public FooDB API
 * (PhytoHub has no public REST API — FooDB is the free substitute).
 */

import type { PhytoHubCompound } from '../types'
import { searchFooDB } from './foodb'

/** Live phytochemical / food-compound search (FooDB). Never invents rows. */
export async function searchPhytoHub(query: string, limit = 15): Promise<PhytoHubCompound[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const compounds = await searchFooDB(q, limit)
    return compounds.map((c) => ({
      id: c.id,
      name: c.name,
      formula: c.formula || '',
      inchi: c.inchi || '',
      inchiKey: c.inchiKey || '',
      smiles: c.smiles || '',
      mass: c.mass || 0,
      foodSources: c.foodSources ?? [],
      healthEffects: [],
      url: c.url || `https://foodb.ca/compounds/${c.id}`,
    }))
  } catch {
    return []
  }
}
