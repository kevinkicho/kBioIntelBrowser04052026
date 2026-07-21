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

/** Minimal CID shell so profile panels can still load when identity APIs are down. */
function identityShell(
  cid: number,
  description: string,
): Molecule {
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
    description,
  }
}

const INCHIKEY_RE = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
}

function asNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Pull formula / MW / InChIKey / IUPAC from MyChem hit.
 * MyChem nests most chemistry under `pubchem.*` (not top-level formula/mass).
 */
function extractChemFromMyChemHit(hit: Record<string, unknown>): {
  formula: string
  molecularWeight: number
  inchiKey: string
  iupacName: string
} {
  const pc =
    hit.pubchem && typeof hit.pubchem === 'object' && !Array.isArray(hit.pubchem)
      ? (hit.pubchem as Record<string, unknown>)
      : {}
  const formula =
    asStr(hit.formula) ||
    asStr(pc.molecular_formula) ||
    asStr(pc.MolecularFormula) ||
    ''
  const molecularWeight =
    asNum(hit.mass) ||
    asNum(pc.molecular_weight) ||
    asNum(pc.exact_mass) ||
    asNum(pc.monoisotopic_weight) ||
    0
  let inchiKey =
    asStr(hit.inchi_key) ||
    asStr(hit.inchikey) ||
    asStr(pc.inchikey) ||
    asStr(pc.inchi_key) ||
    ''
  // MyChem document _id is often the InChIKey
  const id = asStr(hit._id)
  if (!inchiKey && INCHIKEY_RE.test(id)) inchiKey = id
  const iupacObj =
    pc.iupac && typeof pc.iupac === 'object'
      ? (pc.iupac as Record<string, unknown>)
      : null
  const iupacName =
    asStr(hit.iupac_name) ||
    asStr(iupacObj?.preferred) ||
    asStr(iupacObj?.systematic) ||
    asStr(iupacObj?.traditional) ||
    ''
  return { formula, molecularWeight, inchiKey, iupacName }
}

/** Build a Molecule from MyChem when PubChem property PUG is down (App Hosting). */
export async function getMoleculeByCidViaMyChem(
  cid: number,
): Promise<Molecule | null> {
  try {
    // Request nested pubchem chemistry — top-level formula/mass are usually empty
    const url =
      `${MYCHEM_QUERY}?q=pubchem.cid:${cid}` +
      `&fields=name,_id,pubchem,chembl.pref_name,chebi.name,formula,mass,inchi_key,synonyms&size=3`
    const res = await fetch(url, fetchOpts)
    if (!res.ok) {
      // Still shell so category routes do not 502 the whole profile on App Hosting
      return identityShell(
        cid,
        'Minimal identity shell (upstream identity APIs unavailable).',
      )
    }
    const data = (await res.json()) as {
      hits?: Array<Record<string, unknown>>
    }
    const hits = data.hits ?? []
    if (hits.length === 0) {
      return identityShell(
        cid,
        'CID resolved; full structure metadata unavailable (PubChem PUG / MyChem limited).',
      )
    }

    // Prefer the hit with the richest chemistry fields
    let best = hits[0]!
    let bestScore = -1
    for (const h of hits) {
      const chem = extractChemFromMyChemHit(h)
      const score =
        (extractNameFromHit(h) ? 4 : 0) +
        (chem.formula ? 2 : 0) +
        (chem.inchiKey ? 2 : 0) +
        (chem.molecularWeight > 0 ? 1 : 0) +
        (chem.iupacName ? 1 : 0)
      if (score > bestScore) {
        bestScore = score
        best = h
      }
    }

    const name = extractNameFromHit(best) || `CID ${cid}`
    const synonyms = Array.isArray(best.synonyms)
      ? (best.synonyms as string[]).filter((s) => typeof s === 'string').slice(0, 10)
      : []
    const chem = extractChemFromMyChemHit(best)
    const hasChem = Boolean(chem.formula || chem.inchiKey || chem.molecularWeight > 0)
    const realName = !/^CID\s+\d+$/i.test(name)

    return {
      cid,
      name,
      formula: chem.formula,
      molecularWeight: chem.molecularWeight,
      synonyms,
      inchiKey: chem.inchiKey,
      iupacName: chem.iupacName,
      classification: classifyMolecule(name, synonyms),
      structureImageUrl: buildStructureImageUrl(cid),
      description:
        hasChem || realName
          ? 'Identity filled via MyChem (PubChem PUG unavailable from this host). Structure image still from PubChem CDN when available.'
          : 'CID resolved; full structure metadata unavailable (PubChem PUG / MyChem limited).',
    }
  } catch {
    return identityShell(
      cid,
      'Minimal identity shell (upstream identity APIs unavailable).',
    )
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
