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

/** Extract PubChem CIDs from a MyChem hit (pubchem may be object or array). */
function extractCidsFromHit(hit: Record<string, unknown>): number[] {
  const out: number[] = []
  const push = (raw: unknown) => {
    const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
    if (Number.isFinite(n) && n > 0) out.push(n)
  }
  const pc = hit.pubchem
  if (Array.isArray(pc)) {
    for (const item of pc) {
      if (item && typeof item === 'object') push((item as { cid?: unknown }).cid)
    }
  } else if (pc && typeof pc === 'object') {
    push((pc as { cid?: unknown }).cid)
  }
  return out
}

function extractNameFromHit(hit: Record<string, unknown>): string {
  const chembl = hit.chembl as { pref_name?: string } | undefined
  const chebi = hit.chebi as { name?: string } | undefined
  if (typeof hit.name === 'string' && hit.name.trim()) return hit.name.trim()
  if (chembl?.pref_name) return chembl.pref_name.trim()
  if (chebi?.name) return chebi.name.trim()
  return ''
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
        if (!syn || syn.length > 60) continue
        const key = syn.toLowerCase()
        if (seen.has(key)) continue
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
 * MyChem name hits — prefer rows that actually have a PubChem CID
 * (plain "metformin" often matches NDC packaging without CID).
 */
export async function searchMyChemMoleculeNames(
  query: string,
  limit = 8,
): Promise<string[]> {
  try {
    const q = `_exists_:pubchem.cid AND (${query})`
    const url =
      `${MYCHEM_QUERY}?q=${encodeURIComponent(q)}` +
      `&fields=name,chebi.name,chembl.pref_name,pubchem.cid&size=${limit}`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) return []
    const data = (await res.json()) as { hits?: Array<Record<string, unknown>> }
    const names: string[] = []
    const seen = new Set<string>()
    for (const hit of data.hits ?? []) {
      const name = extractNameFromHit(hit)
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(name)
      if (names.length >= limit) break
    }
    // Fallback: chembl pref_name exact-ish
    if (names.length === 0) {
      const q2 = `chembl.pref_name:${query}`
      const url2 =
        `${MYCHEM_QUERY}?q=${encodeURIComponent(q2)}` +
        `&fields=chembl.pref_name,pubchem.cid&size=${limit}`
      const res2 = await fetch(url2, fetchOpts)
      if (res2.ok) {
        const data2 = (await res2.json()) as {
          hits?: Array<Record<string, unknown>>
        }
        for (const hit of data2.hits ?? []) {
          const name = extractNameFromHit(hit)
          if (!name) continue
          const key = name.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          names.push(name)
          if (names.length >= limit) break
        }
      }
    }
    return names
  } catch {
    return []
  }
}

/**
 * Resolve free-text name → PubChem CID (GCP-friendly).
 * MyChem returns pubchem as either {cid} or [{cid}, ...] — both handled.
 */
export async function resolveCidViaMyChem(name: string): Promise<number | null> {
  const qName = name.trim()
  if (!qName) return null

  const queries = [
    // Prefer compound records with a CID (avoids NDC-only packaging hits)
    `_exists_:pubchem.cid AND chembl.pref_name:"${qName.replace(/"/g, '')}"`,
    `_exists_:pubchem.cid AND chembl.pref_name:${qName.replace(/\s+/g, '\\ ')}`,
    `_exists_:pubchem.cid AND (${qName})`,
    `chembl.pref_name:${qName.replace(/\s+/g, '\\ ')}`,
  ]

  for (const q of queries) {
    try {
      const url =
        `${MYCHEM_QUERY}?q=${encodeURIComponent(q)}` +
        `&fields=pubchem.cid,chembl.pref_name,name&size=8`
      const res = await fetch(url, fetchOpts)
      if (!res.ok) continue
      const data = (await res.json()) as {
        hits?: Array<Record<string, unknown>>
      }
      for (const hit of data.hits ?? []) {
        const cids = extractCidsFromHit(hit)
        // Prefer smallest CID (usually the parent compound, e.g. 4091 for metformin)
        if (cids.length) {
          cids.sort((a, b) => a - b)
          return cids[0]!
        }
      }
    } catch {
      /* try next query */
    }
  }
  return null
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
    if (!hit) {
      // Still allow a shell molecule so the profile page can load panels by CID
      return {
        cid,
        name: `CID ${cid}`,
        formula: '',
        molecularWeight: 0,
        synonyms: [],
        inchiKey: '',
        iupacName: '',
        classification: 'unknown',
        structureImageUrl: buildStructureImageUrl(cid),
        description:
          'CID resolved; full structure metadata unavailable (PubChem PUG / MyChem limited).',
      }
    }

    const name = extractNameFromHit(hit) || `CID ${cid}`
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
    return {
      cid,
      name: `CID ${cid}`,
      formula: '',
      molecularWeight: 0,
      synonyms: [],
      inchiKey: '',
      iupacName: '',
      classification: 'unknown',
      structureImageUrl: buildStructureImageUrl(cid),
      description: 'Minimal identity shell (upstream identity APIs unavailable).',
    }
  }
}

/**
 * ChEMBL molecule search returning preferred names.
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
      const n = (m.pref_name || m.molecule_chembl_id || '').trim()
      const chemblId = (m.molecule_chembl_id || '').trim()
      if (!n || !chemblId) continue
      out.push({ name: n, chemblId })
    }
    return out
  } catch {
    return []
  }
}
