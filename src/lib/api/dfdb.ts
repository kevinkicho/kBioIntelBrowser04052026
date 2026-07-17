/**
 * Dietary compound lookups via free public FooDB API
 * (DFDB has no public REST API — FooDB is the free substitute).
 */

import type { DFDBFlavonoid } from '../types'
import { searchFooDB } from './foodb'

/** Live dietary compound search (FooDB). Never invents rows. */
export async function searchDFDB(query: string, limit = 15): Promise<DFDBFlavonoid[]> {
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
      subclasses: [],
      url: c.url || `https://foodb.ca/compounds/${c.id}`,
    }))
  } catch {
    return []
  }
}
