import type { MyChemAnnotation } from '../types'

const BASE_URL = 'https://mychem.info/v1'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Fields that carry real chemical identity (not NDC package records).
 * See https://docs.mychem.info — chembl.pref_name, chebi.name, pubchem.cid, etc.
 */
const ANNOTATION_FIELDS = [
  'chembl.molecule_chembl_id',
  'chembl.pref_name',
  'chembl.max_phase',
  'chembl.molecule_type',
  'chebi.id',
  'chebi.name',
  'chebi.definition',
  'chebi.formula',
  'chebi.mass',
  'chebi.smiles',
  'chebi.synonyms',
  'drugbank.id',
  'drugbank.name',
  'drugbank.groups',
  'drugbank.categories',
  'drugbank.products.name',
  'pubchem.cid',
  'pubchem.molecular_formula',
  'pubchem.molecular_weight',
  'pubchem.inchi_key',
  'pubchem.iupac',
  'pubchem.smiles',
].join(',')

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  if (Array.isArray(v) && v[0] && typeof v[0] === 'object') return v[0] as Record<string, unknown>
  return undefined
}

function asString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

function asStringArray(v: unknown): string[] {
  if (!v) return []
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === 'string') return x.trim()
        if (x && typeof x === 'object' && 'name' in (x as object)) {
          return asString((x as { name?: unknown }).name)
        }
        return asString(x)
      })
      .filter(Boolean)
  }
  if (typeof v === 'string') return v.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
  return []
}

/** MyChem chem annotation page (JSON) — best official deep link for a compound. */
export function mychemChemUrl(inchiKeyOrId: string): string {
  const id = (inchiKeyOrId || '').trim()
  if (!id) return 'https://mychem.info/'
  return `${BASE_URL}/chem/${encodeURIComponent(id)}`
}

export function mychemDeepLinks(chem: Partial<MyChemAnnotation>): {
  mychem: string | null
  chembl: string | null
  pubchem: string | null
  chebi: string | null
  drugbank: string | null
} {
  const inchikey = chem.inchiKey?.trim()
  const chemblId = chem.chemblId?.trim()
  const cid = chem.pubchemCid?.trim()
  const chebiId = chem.chebiId?.trim()
  const drugbankId = chem.drugbankId?.trim()

  return {
    mychem: inchikey
      ? mychemChemUrl(inchikey)
      : chemblId || cid || chebiId || drugbankId
        ? mychemChemUrl(chemblId || cid || chebiId || drugbankId || '')
        : null,
    chembl: chemblId
      ? `https://www.ebi.ac.uk/chembl/explore/compound/${chemblId.toUpperCase().startsWith('CHEMBL') ? chemblId.toUpperCase() : `CHEMBL${chemblId}`}`
      : null,
    pubchem: cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` : null,
    chebi: chebiId
      ? `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${encodeURIComponent(
          /chebi/i.test(chebiId) ? chebiId : `CHEBI:${chebiId}`,
        )}`
      : null,
    drugbank: drugbankId
      ? `https://go.drugbank.com/drugs/${encodeURIComponent(
          drugbankId.toUpperCase().startsWith('DB') ? drugbankId.toUpperCase() : drugbankId,
        )}`
      : null,
  }
}

/**
 * Map a raw MyChem hit /chem object into our annotation shape.
 * Handles object-or-array nesting used by MyChem (e.g. pubchem: {cid} | [{cid}, ...]).
 */
export function mapMyChemHit(hit: Record<string, unknown>): MyChemAnnotation | null {
  if (!hit || hit.notfound === true) return null

  const chembl = asRecord(hit.chembl)
  const chebi = asRecord(hit.chebi)
  const drugbank = asRecord(hit.drugbank)
  const pubchem = asRecord(hit.pubchem)
  const ndc = asRecord(hit.ndc)

  // Skip pure NDC packaging rows with no chemical annotation sources
  const hasChemSource = Boolean(chembl || chebi || drugbank || pubchem)
  if (!hasChemSource && ndc) return null

  const chemblId = asString(chembl?.molecule_chembl_id)
  const pubchemCid = asString(pubchem?.cid)
  const chebiId = asString(chebi?.id)
  const drugbankId = asString(drugbank?.id)
  const inchiKey =
    asString(hit._id).match(/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i)?.[0] ||
    asString(pubchem?.inchi_key) ||
    asString(chebi?.inchikey) ||
    asString(hit.inchi_key) ||
    asString(hit._id)

  const name =
    asString(chembl?.pref_name) ||
    asString(chebi?.name) ||
    asString(drugbank?.name) ||
    asString(hit.name) ||
    asString((pubchem?.iupac as Record<string, unknown> | undefined)?.traditional) ||
    asString(ndc?.nonproprietaryname) ||
    asString(ndc?.substancename) ||
    asString(ndc?.proprietaryname) ||
    ''

  if (!name && !chemblId && !pubchemCid && !chebiId && !drugbankId && !inchiKey) {
    return null
  }

  const formula =
    asString(chebi?.formula) ||
    asString(pubchem?.molecular_formula) ||
    asString(hit.formula)

  const molecularWeight =
    asNumber(chebi?.mass) ||
    asNumber(pubchem?.molecular_weight) ||
    asNumber(hit.mass)

  const smiles =
    asString(chebi?.smiles) ||
    asString((pubchem?.smiles as Record<string, unknown> | undefined)?.isomeric) ||
    asString(hit.smiles)

  const synonyms = [
    ...asStringArray(chebi?.synonyms),
    ...asStringArray(hit.synonyms),
  ].filter((s, i, arr) => s && arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)

  const sources = (['chembl', 'chebi', 'drugbank', 'pubchem'] as const).filter((k) =>
    Boolean(asRecord(hit[k]) || (Array.isArray(hit[k]) && (hit[k] as unknown[]).length)),
  )

  const annotation: MyChemAnnotation = {
    chemblId,
    pubchemCid,
    chebiId,
    inchiKey: inchiKey.match(/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i) ? inchiKey.toUpperCase() : inchiKey,
    drugbankId,
    name: name || chemblId || (pubchemCid ? `CID ${pubchemCid}` : '') || chebiId || drugbankId || 'Unknown compound',
    synonyms: synonyms.slice(0, 30),
    formula,
    molecularWeight,
    smiles,
    sources: [...sources],
    url: mychemChemUrl(
      inchiKey.match(/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i)
        ? inchiKey.toUpperCase()
        : chemblId || pubchemCid || chebiId || drugbankId || '',
    ),
  }

  if (chembl) {
    annotation.chembl = {
      moleculeType: asString(chembl.molecule_type),
      maxPhase: asNumber(chembl.max_phase),
      indications: asStringArray(chembl.indications),
    }
  }
  if (chebi) {
    annotation.chebi = {
      name: asString(chebi.name),
      definition: asString(chebi.definition),
      parentIds: asStringArray(chebi.parents),
    }
  }
  if (drugbank) {
    annotation.drugbank = {
      categories: asStringArray(drugbank.categories).map((c) =>
        typeof c === 'string' ? c : asString((c as unknown as { category?: string }).category),
      ).filter(Boolean),
      groups: asStringArray(drugbank.groups),
      atcCodes: asStringArray(drugbank.atc_codes),
    }
  }

  return annotation
}

async function queryMyChem(
  q: string,
  size = 15,
  signal?: AbortSignal,
): Promise<MyChemAnnotation[]> {
  if (signal?.aborted) return []
  const url =
    `${BASE_URL}/query?q=${encodeURIComponent(q)}` +
    `&fields=${encodeURIComponent(ANNOTATION_FIELDS)}` +
    `&size=${size}`
  const res = await fetch(url, { ...fetchOptions, signal })
  if (!res.ok) return []
  const data = await res.json()
  const hits: Record<string, unknown>[] = Array.isArray(data?.hits) ? data.hits : []
  const out: MyChemAnnotation[] = []
  const seen = new Set<string>()
  for (const hit of hits) {
    const mapped = mapMyChemHit(hit)
    if (!mapped) continue
    const key =
      mapped.inchiKey ||
      mapped.chemblId ||
      mapped.pubchemCid ||
      mapped.chebiId ||
      mapped.drugbankId ||
      mapped.name
    if (!key || seen.has(key.toLowerCase())) continue
    seen.add(key.toLowerCase())
    out.push(mapped)
  }
  return out
}

/**
 * Annotation service: GET /v1/chem/{id}
 * Accepts InChIKey, ChEMBL, ChEBI, PubChem CID, UNII (per MyChem docs).
 */
export async function getChemicalById(chemId: string): Promise<MyChemAnnotation | null> {
  try {
    const id = (chemId || '').trim()
    if (!id) return null
    const url = `${BASE_URL}/chem/${encodeURIComponent(id)}?fields=${encodeURIComponent(ANNOTATION_FIELDS)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const hit = await res.json()
    return mapMyChemHit(hit as Record<string, unknown>)
  } catch {
    return null
  }
}

/** @deprecated use getChemicalById — kept for call-site compatibility */
export async function getChemicalByInchiKey(inchiKey: string): Promise<MyChemAnnotation | null> {
  return getChemicalById(inchiKey)
}

/**
 * Run fielded queries in parallel; resolve with the first non-empty hit list.
 * Remaining in-flight requests are aborted via shared AbortController.
 */
async function firstNonEmptyFielded(
  fielded: string[],
): Promise<MyChemAnnotation[]> {
  if (fielded.length === 0) return []
  const controller = new AbortController()
  return new Promise((resolve) => {
    let remaining = fielded.length
    let settled = false
    const finish = (hits: MyChemAnnotation[]) => {
      if (settled) return
      settled = true
      try {
        controller.abort()
      } catch {
        /* ignore */
      }
      resolve(hits)
    }
    for (const fq of fielded) {
      queryMyChem(fq, 12, controller.signal)
        .then((hits) => {
          if (settled) return
          if (hits.length > 0) {
            finish(hits)
            return
          }
          remaining -= 1
          if (remaining === 0) finish([])
        })
        .catch(() => {
          if (settled) return
          remaining -= 1
          if (remaining === 0) finish([])
        })
    }
  })
}

/**
 * Search chemicals by name using fielded queries so NDC package rows don't dominate.
 * Docs: https://docs.mychem.info/en/latest/doc/chem_query_service.html
 *
 * Fielded queries run in parallel; first non-empty result wins (early cancel).
 */
export async function searchChemicals(query: string): Promise<MyChemAnnotation[]> {
  try {
    const q = (query || '').trim()
    if (!q) return []

    const safe = q.replace(/"/g, '')
    // Prefer chemical sources that actually carry names/IDs
    const fielded = [
      `chembl.pref_name:"${safe}"`,
      `chebi.name:"${safe}"`,
      `drugbank.name:"${safe}"`,
      `_exists_:chembl AND ${q}`,
      `_exists_:pubchem.cid AND ${q}`,
    ]

    const hits = await firstNonEmptyFielded(fielded)
    if (hits.length > 0) return hits

    // Last resort free-text (filter mapper drops pure NDC)
    return queryMyChem(q, 20)
  } catch {
    return []
  }
}

/**
 * Main export: resolve annotations for a molecule name and optional identifiers.
 * Prefer /chem/{inchikey|cid|chembl} when available, else fielded name search.
 * Stops after the first successful ID annotation hit (no multi-ID fanout).
 */
export async function getMyChemData(
  name: string,
  opts?: { inchiKey?: string | null; cid?: number | string | null; chemblId?: string | null },
): Promise<{ chemicals: MyChemAnnotation[] }> {
  const chemicals: MyChemAnnotation[] = []
  const seen = new Set<string>()

  const push = (c: MyChemAnnotation | null) => {
    if (!c) return
    const key = (c.inchiKey || c.chemblId || c.pubchemCid || c.name).toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    chemicals.push(c)
  }

  // Identity-first: stop after first successful annotation (InChIKey → ChEMBL → CID)
  if (opts?.inchiKey?.trim()) {
    push(await getChemicalById(opts.inchiKey.trim()))
    if (chemicals.length > 0) return { chemicals: chemicals.slice(0, 15) }
  }
  if (opts?.chemblId?.trim()) {
    push(await getChemicalById(opts.chemblId.trim()))
    if (chemicals.length > 0) return { chemicals: chemicals.slice(0, 15) }
  }
  if (opts?.cid != null && String(opts.cid).trim()) {
    push(await getChemicalById(String(opts.cid).trim()))
    if (chemicals.length > 0) return { chemicals: chemicals.slice(0, 15) }
  }

  if (chemicals.length === 0 && name?.trim()) {
    const searched = await searchChemicals(name.trim())
    for (const c of searched) push(c)
  }

  return { chemicals: chemicals.slice(0, 15) }
}
