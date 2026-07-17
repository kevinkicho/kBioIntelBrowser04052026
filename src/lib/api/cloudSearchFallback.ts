/**
 * Cloud-friendly molecule search / identity when PubChem is blocked or 503s
 * from GCP App Hosting egress (common). Free public APIs only.
 */

import type { Molecule } from '../types'
import { classifyMolecule, buildStructureImageUrl } from '../utils'

const CHEMBL_SEARCH =
  'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const MYCHEM_QUERY = 'https://mychem.info/v1/query'

const fetchOpts: RequestInit = {
  cache: 'no-store',
  headers: {
    Accept: 'application/json',
    'User-Agent': 'BioIntel/0.1 (cloud-fallback; free-API research)',
  },
}

/** ChEMBL free-text molecule names (works well from GCP). */
export async function searchChemblMoleculeNames(
  query: string,
  limit = 8,
): Promise<string[]> {
  try {
    const url = `${CHEMBL_SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return []
    const data = (await res.json()) as {
      molecules?: Array<{
        pref_name?: string | null
        molecule_synonyms?: Array<{ molecule_synonym?: string }>
        molecule_chembl_id?: string
      }>
    }
    const names: string[] = []
    const seen = new Set<string>()
    for (const m of data.molecules ?? []) {
      const pref = (m.pref_name || '').trim()
      if (pref) {
        const key = pref.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          names.push(pref)
        }
      }
      for (const s of m.molecule_synonyms ?? []) {
        const syn = (s.molecule_synonym || '').trim()
        if (!syn) continue
        const key = syn.toLowerCase()
        if (seen.has(key)) continue
        // Prefer short synonym-like names
        if (syn.length > 60) continue
        seen.add(key)
        names.push(syn)
        if (names.length >= limit) break
      }
      if (names.length >= limit) break
    }
    return names.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * MyChem name hits with PubChem CIDs when present.
 * Returns suggestion labels preferred by the search UI (names).
 */
export async function searchMyChemMoleculeNames(
  query: string,
  limit = 8,
): Promise<string[]> {
  try {
    const url =
      `${MYCHEM_QUERY}?q=${encodeURIComponent(query)}` +
      `&fields=name,chebi.name,chembl.pref_name,pubchem.cid&size=${limit}`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return []
    const data = (await res.json()) as {
      hits?: Array<Record<string, unknown>>
    }
    const names: string[] = []
    const seen = new Set<string>()
    for (const hit of data.hits ?? []) {
      const chembl = hit.chembl as { pref_name?: string } | undefined
      const chebi = hit.chebi as { name?: string } | undefined
      const label =
        (typeof hit.name === 'string' && hit.name) ||
        chembl?.pref_name ||
        chebi?.name ||
        ''
      const name = label.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(name)
      if (names.length >= limit) break
    }
    return names
  } catch {
    return []
  }
}

/** Resolve a free-text name → PubChem CID via MyChem (GCP-friendly). */
export async function resolveCidViaMyChem(name: string): Promise<number | null> {
  try {
    const url =
      `${MYCHEM_QUERY}?q=${encodeURIComponent(name)}` +
      `&fields=pubchem.cid,name&size=5`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return null
    const data = (await res.json()) as {
      hits?: Array<{ pubchem?: { cid?: number | string }; name?: string }>
    }
    for (const hit of data.hits ?? []) {
      const raw = hit.pubchem?.cid
      const cid = typeof raw === 'number' ? raw : parseInt(String(raw || ''), 10)
      if (Number.isFinite(cid) && cid > 0) return cid
    }
    return null
  } catch {
    return null
  }
}

/** Build a minimal Molecule from MyChem when PubChem property PUG is down. */
export async function getMoleculeByCidViaMyChem(
  cid: number,
): Promise<Molecule | null> {
  try {
    const url =
      `${MYCHEM_QUERY}?q=pubchem.cid:${cid}` +
      `&fields=name,pubchem.cid,chembl.pref_name,chebi.name,formula,mass,inchi_key,synonyms&size=1`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return null
    const data = (await res.json()) as {
      hits?: Array<Record<string, unknown>>
    }
    const hit = data.hits?.[0]
    if (!hit) return null

    const chembl = hit.chembl as { pref_name?: string } | undefined
    const chebi = hit.chebi as { name?: string } | undefined
    const name =
      (typeof hit.name === 'string' && hit.name) ||
      chembl?.pref_name ||
      chebi?.name ||
      `CID ${cid}`
    const synonyms = Array.isArray(hit.synonyms)
      ? (hit.synonyms as string[]).filter((s) => typeof s === 'string').slice(0, 10)
      : []
    const formula = typeof hit.formula === 'string' ? hit.formula : ''
    const mw =
      typeof hit.mass === 'number'
        ? hit.mass
        : parseFloat(String(hit.mass || '0')) || 0
    const inchiKey =
      typeof hit.inchi_key === 'string' ? hit.inchi_key : ''

    return {
      cid,
      name,
      formula,
      molecularWeight: mw,
      synonyms,
      inchiKey,
      iupacName: '',
      classification: classifyMolecule(name, synonyms),
      structureImageUrl: buildStructureImageUrl(cid),
      description:
        'Identity resolved via MyChem fallback (PubChem PUG unavailable from this host).',
    }
  } catch {
    return null
  }
}

/**
 * ChEMBL molecule search returning preferred names with optional cross-ref CID
 * via a second MyChem hop only when needed for resolve.
 */
export async function searchChemblMoleculesDetailed(
  query: string,
  limit = 8,
): Promise<Array<{ name: string; chemblId: string }>> {
  try {
    const url = `${CHEMBL_SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return []
    const data = (await res.json()) as {
      molecules?: Array<{
        pref_name?: string | null
        molecule_chembl_id?: string
      }>
    }
    const out: Array<{ name: string; chemblId: string }> = []
    for (const m of data.molecules ?? []) {
      const name = (m.pref_name || m.molecule_chembl_id || '').trim()
      const chemblId = (m.molecule_chembl_id || '').trim()
      if (!name || !chemblId) continue
      out.push({ name, chemblId })
    }
    return out
  } catch {
    return []
  }
}
