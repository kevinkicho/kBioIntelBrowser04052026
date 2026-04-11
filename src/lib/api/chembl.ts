import type { ChemblActivity, RelatedCompound } from '../types'
import { LIMITS } from '../api-limits'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const ACTIVITY_URL = 'https://www.ebi.ac.uk/chembl/api/data/activity.json'
const TARGET_URL = 'https://www.ebi.ac.uk/chembl/api/data/target.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search for molecule by name and get ChEMBL ID
 */
export async function getChemblIdByName(name: string): Promise<string | null> {
  try {
    const url = `${SEARCH_URL}?q=${encodeURIComponent(name)}&limit=1`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const molecules = data.molecules ?? []
    return molecules.length > 0 ? molecules[0].molecule_chembl_id : null
  } catch {
    return null
  }
}

/**
 * Search for targets by molecule name
 * Uses multiple search strategies for better coverage
 */
export async function searchTargetsByMoleculeName(name: string, limit: number = 10): Promise<Array<{
  targetChemblId: string
  targetName: string
  targetType: string
  organism: string
}>> {
  try {
    // First get the molecule ChEMBL ID
    const chemblId = await getChemblIdByName(name)
    if (!chemblId) return []
    
    // Get activities for this molecule (includes target info)
    const activities = await getChemblActivitiesByName(name, limit * 2)
    
    // Extract unique targets from activities
    const targetMap = new Map<string, {
      targetChemblId: string
      targetName: string
      targetType: string
      organism: string
    }>()
    
    for (const activity of activities) {
      if (!targetMap.has(activity.targetChemblId)) {
        targetMap.set(activity.targetChemblId, {
          targetChemblId: activity.targetChemblId,
          targetName: activity.targetName,
          targetType: activity.assayType || 'Unknown',
          organism: ''
        })
      }
    }
    
    return Array.from(targetMap.values()).slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Get bioactivity data for a molecule
 */
export async function getChemblActivitiesByName(name: string, limit: number = LIMITS.CHEMBL.initial): Promise<ChemblActivity[]> {
  try {
    const chemblId = await getChemblIdByName(name)
    if (!chemblId) return []

    const url = `${ACTIVITY_URL}?molecule_chembl_id=${chemblId}&limit=${limit}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.activities ?? []).map((a: {
      target_pref_name?: string
      target_chembl_id: string
      standard_type?: string
      standard_value?: number | string
      standard_units?: string
      assay_type?: string
    }) => ({
      targetName: a.target_pref_name ?? 'Unknown target',
      targetChemblId: a.target_chembl_id,
      activityType: a.standard_type ?? '',
      activityValue: Number(a.standard_value) || 0,
      activityUnits: a.standard_units ?? '',
      assayType: a.assay_type ?? '',
      chemblId,
    }))
  } catch {
    return []
  }
}

/**
 * Get target details by ChEMBL target ID
 */
export async function getTargetDetails(targetId: string): Promise<{
  targetId: string
  targetName: string
  targetType: string
  organism: string
  description?: string
} | null> {
  try {
    const url = `${TARGET_URL}/${targetId}.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    
    const data = await res.json()
    return {
      targetId: data.target_chembl_id ?? targetId,
      targetName: data.pref_name ?? 'Unknown',
      targetType: data.target_type ?? 'Unknown',
      organism: data.organism ?? '',
      description: data.description
    }
  } catch {
    return null
  }
}

/**
 * Get compounds related to a specific target
 */
export async function getRelatedCompoundsByTarget(targetId: string): Promise<RelatedCompound[]> {
  try {
    const url = `${ACTIVITY_URL}?target_chembl_id=${targetId}&standard_type=IC50&limit=15&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const seenMolecules = new Set<string>()
    const results: RelatedCompound[] = []

    for (const a of (data.activities ?? [])) {
      if (!a.molecule_chembl_id || seenMolecules.has(a.molecule_chembl_id)) continue
      seenMolecules.add(a.molecule_chembl_id)

      results.push({
        compoundId: a.molecule_chembl_id,
        compoundName: a.molecule_pref_name || a.molecule_chembl_id,
        name: a.molecule_pref_name || a.molecule_chembl_id,
        similarity: 100,
        relationship: 'Related',
        chemblId: a.molecule_chembl_id,
        maxPhase: a.molecule_max_phase || 0,
        activityValue: Number(a.standard_value) || 0,
        activityType: a.standard_type || 'IC50',
      })
    }

    return results.sort((a, b) => a.maxPhase === b.maxPhase ? (a.activityValue ?? 0) - (b.activityValue ?? 0) : b.maxPhase - a.maxPhase)
  } catch {
    return []
  }
}

/**
 * Search targets directly by name (for target-centric queries)
 */
export async function searchTargetsByName(query: string, limit: number = 10): Promise<Array<{
  targetChemblId: string
  targetName: string
  targetType: string
  organism: string
}>> {
  try {
    const url = `${TARGET_URL}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    
    const data = await res.json()
    const targets = data.targets ?? []
    
    return targets.map((t: {
      target_chembl_id: string
      pref_name: string
      target_type: string
      organism: string
    }) => ({
      targetChemblId: t.target_chembl_id,
      targetName: t.pref_name,
      targetType: t.target_type,
      organism: t.organism
    }))
  } catch {
    return []
  }
}

/**
 * Get comprehensive ChEMBL data for a molecule including targets
 */
export async function getChemblDataWithTargets(name: string): Promise<{
  chemblId: string | null
  activities: ChemblActivity[]
  targets: Array<{
    targetChemblId: string
    targetName: string
    targetType: string
    organism: string
  }>
}> {
  const chemblId = await getChemblIdByName(name)
  if (!chemblId) {
    return { chemblId: null, activities: [], targets: [] }
  }
  
  const activities = await getChemblActivitiesByName(name)
  const targets = await searchTargetsByMoleculeName(name)
  
  return { chemblId, activities, targets }
}
