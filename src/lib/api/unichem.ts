import type { UniChemMapping, UniChemSource } from '../types'

const BASE_URL = 'https://www.ebi.ac.uk/unichem/rest'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Get UniChem sources
 * Returns list of all data sources available in UniChem
 */
export async function getUniChemSources(): Promise<UniChemSource[]> {
  try {
    const url = `${BASE_URL}/source`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []

    const data = await res.json()
    return data.map((source: Record<string, unknown>) => ({
      sourceId: String(source.src_id || ''),
      name: String(source.name || ''),
      fullName: String(source.name_long || ''),
      url: String(source.url || ''),
      description: String(source.description || ''),
    }))
  } catch (error) {
    console.error('UniChem sources fetch error:', error)
    return []
  }
}

/**
 * Get cross-references for a compound by InChIKey
 * Returns mappings to other databases
 */
export async function getUniChemMappings(inchiKey: string): Promise<UniChemMapping[]> {
  try {
    // InChIKey is 27 characters (first 14 = skeleton, next 10 = connectivity, last 1 = proton)
    const url = `${BASE_URL}/inchikey/${encodeURIComponent(inchiKey)}/mappings`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []

    const data = await res.json()
    return data.map((item: Record<string, unknown>) => ({
      sourceId: String(item.src_id || ''),
      sourceName: String(item.name || ''),
      externalId: String(item.pcdid || item.identifier || ''),
      url: String(item.url || ''),
    }))
  } catch (error) {
    console.error('UniChem mappings fetch error:', error)
    return []
  }
}

/**
 * Get cross-references from one database to another
 * Example: Get all ChEMBL IDs for a given PubChem CID
 */
export async function getUniChemCrossRefs(
  fromSource: string,
  fromId: string,
  toSource?: string
): Promise<UniChemMapping[]> {
  try {
    let url = `${BASE_URL}/from_source/${encodeURIComponent(fromSource)}/from_src_id/${encodeURIComponent(fromId)}`
    if (toSource) {
      url += `/to_source/${encodeURIComponent(toSource)}`
    } else {
      url += '/all_mappings'
    }

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []

    const data = await res.json()
    return data.map((item: Record<string, unknown>) => ({
      sourceId: String(item.src_id || ''),
      sourceName: String(item.name || ''),
      externalId: String(item.pcdid || item.identifier || ''),
      url: String(item.url || ''),
    }))
  } catch (error) {
    console.error('UniChem cross-refs fetch error:', error)
    return []
  }
}

/**
 * Resolve a compound identifier to InChIKey
 * Useful for getting a canonical identifier
 */
export async function resolveToInChIKey(source: string, id: string): Promise<string | null> {
  try {
    const url = `${BASE_URL}/from_source/${encodeURIComponent(source)}/from_src_id/${encodeURIComponent(id)}/inchikey`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null

    const data = await res.json()
    return data?.[0]?.inchikey || null
  } catch (error) {
    console.error('UniChem resolve error:', error)
    return null
  }
}

/**
 * Get all database IDs for a compound given one identifier
 * Convenience function that combines resolve + mappings
 */
export async function getAllCompoundIds(source: string, id: string): Promise<{
  inchiKey: string | null
  mappings: Record<string, string>
}> {
  const inchiKey = await resolveToInChIKey(source, id)
  const mappings: Record<string, string> = { [source]: id }

  if (inchiKey) {
    const crossRefs = await getUniChemCrossRefs(source, id)
    for (const ref of crossRefs) {
      mappings[ref.sourceName] = ref.externalId
    }
  }

  return { inchiKey, mappings }
}
