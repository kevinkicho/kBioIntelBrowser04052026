import type { ChemblActivity, RelatedCompound } from '../types'
import { LIMITS } from '../api-limits'
import {
  chemblActivityDeepLink,
  chemblCompoundUrl,
  chemblTargetUrl,
  normalizeChemblId,
} from '../chemblLinks'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const ACTIVITY_URL = 'https://www.ebi.ac.uk/chembl/api/data/activity.json'
const TARGET_URL = 'https://www.ebi.ac.uk/chembl/api/data/target.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search for molecule by name and get ChEMBL ID
 */
export async function getChemblIdByName(name: string): Promise<string | null> {
  try {
    // InChIKey (preferred default) or free-text name
    const isInchiKey = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i.test(name.trim())
    const url = isInchiKey
      ? `https://www.ebi.ac.uk/chembl/api/data/molecule.json?molecule_structures__standard_inchi_key=${encodeURIComponent(name.trim())}&limit=1`
      : `${SEARCH_URL}?q=${encodeURIComponent(name)}&limit=1`
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

    const molId = normalizeChemblId(chemblId) || chemblId
    return (data.activities ?? []).map(
      (a: {
        activity_id?: number | string
        target_pref_name?: string
        target_chembl_id?: string
        assay_chembl_id?: string
        molecule_chembl_id?: string
        standard_type?: string
        standard_value?: number | string
        standard_units?: string
        assay_type?: string
        pchembl_value?: number | string
        target_organism?: string
      }) => {
        const targetChemblId = normalizeChemblId(a.target_chembl_id) || a.target_chembl_id || ''
        const assayChemblId = normalizeChemblId(a.assay_chembl_id) || ''
        const moleculeChemblId =
          normalizeChemblId(a.molecule_chembl_id) || molId
        const activityId = a.activity_id != null ? String(a.activity_id) : ''
        return {
          activityId,
          targetName: a.target_pref_name ?? 'Unknown target',
          targetOrganism: a.target_organism ?? '',
          targetChemblId,
          chemblId: moleculeChemblId,
          assayType: a.assay_type ?? '',
          standardType: a.standard_type ?? '',
          standardValue: Number(a.standard_value) || 0,
          standardUnits: a.standard_units ?? '',
          pchemblValue: Number(a.pchembl_value) || 0,
          activityType: a.standard_type ?? '',
          activityValue: Number(a.standard_value) || 0,
          activityUnits: a.standard_units ?? '',
          // Prefer target report card (direct); assay / molecule as fallbacks
          url: chemblActivityDeepLink({
            targetChemblId,
            assayChemblId,
            moleculeChemblId,
            chemblId: moleculeChemblId,
            activityId,
          }),
        } satisfies ChemblActivity
      },
    )
  } catch {
    return []
  }
}

/** Public helpers re-export for panels that only have an id. */
export { chemblCompoundUrl, chemblTargetUrl, normalizeChemblId }

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

const MOLECULE_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule.json'

/** Batch-resolve pref_name + max_phase for ChEMBL molecule ids (activity rows often omit both). */
async function enrichMoleculesById(
  chemblIds: string[],
): Promise<Map<string, { name: string; maxPhase: number }>> {
  const map = new Map<string, { name: string; maxPhase: number }>()
  const ids = chemblIds.filter(Boolean).slice(0, 40)
  if (ids.length === 0) return map
  try {
    const url =
      `${MOLECULE_URL}?molecule_chembl_id__in=${encodeURIComponent(ids.join(','))}` +
      `&limit=${ids.length}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return map
    const data = await res.json()
    for (const m of data.molecules ?? []) {
      const id = String(m.molecule_chembl_id || '')
      if (!id) continue
      map.set(id, {
        name: String(m.pref_name || '').trim(),
        maxPhase: Number(m.max_phase) || 0,
      })
    }
  } catch {
    /* optional enrichment */
  }
  return map
}

/**
 * Get compounds related to a specific target (IC50 activities).
 * @param targetId ChEMBL target id (e.g. CHEMBL203)
 * @param limit Max unique molecules (discovery default: 15 for 5×15 gather)
 */
export async function getRelatedCompoundsByTarget(
  targetId: string,
  limit: number = 15,
): Promise<RelatedCompound[]> {
  if (!targetId?.trim()) return []
  try {
    const cap = Math.max(1, Math.min(limit, 50))
    // Over-fetch activities so dedupe can still fill `cap` unique molecules
    const fetchLimit = Math.min(cap * 4, 120)
    // Prefer potency-ranked IC50 rows when available
    const url =
      `${ACTIVITY_URL}?target_chembl_id=${encodeURIComponent(targetId)}` +
      `&standard_type=IC50&limit=${fetchLimit}&order_by=standard_value&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const seenMolecules = new Set<string>()
    const draft: RelatedCompound[] = []

    for (const a of data.activities ?? []) {
      const molId = normalizeChemblId(a.molecule_chembl_id) || String(a.molecule_chembl_id || '')
      if (!molId || seenMolecules.has(molId)) continue
      seenMolecules.add(molId)

      const pref = String(a.molecule_pref_name || '').trim()
      const stdVal = Number(a.standard_value)
      const pchembl = a.pchembl_value != null ? Number(a.pchembl_value) : null

      draft.push({
        compoundId: molId,
        compoundName: pref || molId,
        name: pref || molId,
        similarity: 100,
        relationship: 'Related',
        chemblId: molId,
        maxPhase: Number(a.molecule_max_phase) || 0,
        activityValue: Number.isFinite(stdVal) ? stdVal : undefined,
        activityUnits: String(a.standard_units || a.units || '').trim() || undefined,
        activityType: String(a.standard_type || a.type || 'IC50').trim() || 'IC50',
        pchemblValue: Number.isFinite(pchembl as number) ? (pchembl as number) : null,
        targetChemblId: String(a.target_chembl_id || targetId),
        targetName: String(a.target_pref_name || '').trim() || undefined,
        url: chemblCompoundUrl(molId) || undefined,
      })
      if (draft.length >= cap) break
    }

    // Enrich missing names / max_phase from molecule records
    const needEnrich = draft
      .filter((c) => !c.name || c.name === c.chemblId || !c.maxPhase)
      .map((c) => c.chemblId)
    if (needEnrich.length > 0) {
      const enriched = await enrichMoleculesById(needEnrich)
      for (const c of draft) {
        const meta = enriched.get(c.chemblId)
        if (!meta) continue
        if (meta.name && (!c.name || c.name === c.chemblId)) {
          c.name = meta.name
          c.compoundName = meta.name
        }
        if (!c.maxPhase && meta.maxPhase) c.maxPhase = meta.maxPhase
      }
    }

    return draft.sort((a, b) => {
      // Prefer clinical maturity, then potency (lower IC50 / higher pChEMBL)
      if (a.maxPhase !== b.maxPhase) return b.maxPhase - a.maxPhase
      const pa = a.pchemblValue ?? 0
      const pb = b.pchemblValue ?? 0
      if (pa !== pb) return pb - pa
      const va = a.activityValue ?? Number.POSITIVE_INFINITY
      const vb = b.activityValue ?? Number.POSITIVE_INFINITY
      return va - vb
    })
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
