import type { UniChemMapping, UniChemSource } from '../types'

const UNICHEM_API = 'https://www.ebi.ac.uk/unichem/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** UniChem sourceID → short name (stable public IDs). */
const SOURCE_ID_NAMES: Record<string, string> = {
  '1': 'chembl',
  '2': 'drugbank',
  '3': 'pdb',
  '4': 'iuphar',
  '6': 'kegg_ligand',
  '7': 'chebi',
  '9': 'zinc',
  '14': 'ibm',
  '17': 'pharmgkb',
  '18': 'hmdb',
  '20': 'surechembl',
  '21': 'emolecules',
  '22': 'pubchem',
  '23': 'mcule',
  '24': 'nmrshiftdb2',
  '25': 'lincs',
  '27': 'bindingdb',
  '29': 'metabolights',
  '31': 'gtopdb',
  '32': 'swisslipids',
  '33': 'gtopdb',
  '34': 'drugcentral',
  '37': 'comptox',
}

/**
 * Build a stable deep link into the *target* database (not UniChem homepage).
 * Prefer this over UniChem SPA hash routes (`/unichem/#/search/...`) which 404 / home-dump.
 */
export function unichemMappingDeepLink(
  sourceName: string,
  externalId: string,
  sourceId?: string,
): string {
  const id = (externalId || '').trim()
  if (!id) return 'https://www.ebi.ac.uk/unichem/'

  const key = normalizeSourceKey(sourceName, sourceId)

  // --- Major chemistry / drug DBs ---
  if (key === 'chembl' || key === 'chembldb' || key === 'surechembl') {
    const chembl = id.toUpperCase().startsWith('CHEMBL')
      ? id.toUpperCase().replace(/\s+/g, '')
      : `CHEMBL${id.replace(/\D/g, '')}`
    if (chembl.length > 6) {
      return `https://www.ebi.ac.uk/chembl/explore/compound/${chembl}`
    }
  }

  if (key === 'drugbank') {
    const db = id.toUpperCase().startsWith('DB') ? id.toUpperCase() : `DB${id.replace(/\D/g, '')}`
    return `https://go.drugbank.com/drugs/${encodeURIComponent(db)}`
  }

  if (key === 'pubchem' || key === 'pubchem_dotf' || key === 'pubchem_tpharma') {
    const cid = id.replace(/\D/g, '') || id
    return `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(cid)}`
  }

  if (key === 'chebi') {
    const chebi = /chebi/i.test(id) ? id.toUpperCase().replace('CHEBI:', 'CHEBI:') : `CHEBI:${id.replace(/\D/g, '')}`
    return `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${encodeURIComponent(chebi)}`
  }

  if (key === 'hmdb' || key === 'human metabolome database') {
    const hmdb = id.toUpperCase().startsWith('HMDB') ? id.toUpperCase() : `HMDB${id.padStart(7, '0')}`
    return `https://hmdb.ca/metabolites/${encodeURIComponent(hmdb)}`
  }

  if (key === 'kegg' || key === 'kegg_ligand' || key === 'kegg ligand') {
    return `https://www.kegg.jp/entry/${encodeURIComponent(id)}`
  }

  if (key === 'zinc' || key === 'zinc15' || key === 'zinc20') {
    return `https://zinc.docking.org/substances/${encodeURIComponent(id)}/`
  }

  if (key === 'pdb' || key === 'pdbe' || key === 'rcsb') {
    // Ligand CCD codes are typically 1–3 chars
    return `https://www.rcsb.org/ligand/${encodeURIComponent(id)}`
  }

  if (key === 'bindingdb') {
    return `https://www.bindingdb.org/rwd/bind/chemsearch/marvin/MolStructure.jsp?monomerid=${encodeURIComponent(id)}`
  }

  if (key === 'pharmgkb') {
    return `https://www.pharmgkb.org/chemical/${encodeURIComponent(id)}`
  }

  if (key === 'drugcentral') {
    return `https://drugcentral.org/drugcard/${encodeURIComponent(id)}`
  }

  if (key === 'iuphar' || key === 'gtopdb' || key === 'guidetopharmacology' || key === 'guide to pharmacology') {
    return `https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=${encodeURIComponent(id)}`
  }

  if (key === 'swisslipids') {
    return `https://www.swisslipids.org/#/entity/${encodeURIComponent(id)}/`
  }

  if (key === 'metabolights') {
    return `https://www.ebi.ac.uk/metabolights/${encodeURIComponent(id)}`
  }

  if (key === 'lincs' || key === 'broad institute') {
    return `https://lincs.hms.harvard.edu/db/sm/${encodeURIComponent(id)}`
  }

  if (key === 'mcule') {
    return `https://mcule.com/${encodeURIComponent(id)}`
  }

  if (key === 'emolecules') {
    return `https://www.emolecules.com/cgi-bin/search?t=res&q=${encodeURIComponent(id)}`
  }

  if (key === 'comptox' || key === 'epa' || key === 'dsstox') {
    return `https://comptox.epa.gov/dashboard/chemical/details/${encodeURIComponent(id)}`
  }

  if (key === 'nmrshiftdb2' || key === 'nmrshiftdb') {
    return `https://nmrshiftdb.nmr.uni-koeln.de/molecule/${encodeURIComponent(id)}`
  }

  // UniChem compound page (better than bare homepage when we only have source/id)
  return `https://www.ebi.ac.uk/unichem/compoundsources?type=sourceID&compound=${encodeURIComponent(id)}&sourceID=${encodeURIComponent(sourceId || '')}`
}

function normalizeSourceKey(sourceName: string, sourceId?: string): string {
  const fromId = sourceId ? SOURCE_ID_NAMES[String(sourceId)] : ''
  if (fromId) return fromId
  return (sourceName || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '_')
}

function isStableExternalUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return false
  // UniChem SPA shells dump users on the main page
  if (/ebi\.ac\.uk\/unichem\/?#/i.test(u)) return false
  if (/ebi\.ac\.uk\/unichem\/?$/i.test(u.replace(/[?#].*$/, ''))) return false
  return true
}

function resolveUrl(
  sourceName: string,
  externalId: string,
  sourceId: string,
  apiUrl?: string,
  baseIdUrl?: string,
): string {
  if (isStableExternalUrl(apiUrl)) return apiUrl!.trim()
  // UniChem sources often expose baseIdUrl + compound id
  if (baseIdUrl?.trim() && externalId) {
    const base = baseIdUrl.trim()
    const joined = base.endsWith('/') ? `${base}${externalId}` : `${base}${externalId}`
    if (isStableExternalUrl(joined)) return joined
  }
  return unichemMappingDeepLink(sourceName, externalId, sourceId)
}

interface UniChemApiSource {
  sourceID?: number | string
  src_id?: number | string
  name?: string
  nameLabel?: string
  nameLong?: string
  shortName?: string
  src_compound_id?: string
  compoundId?: string
  id?: string
  url?: string
  srcUrl?: string
  baseIdUrl?: string
}

interface UniChemApiCompound {
  sources?: UniChemApiSource[]
  standardInchiKey?: string
  inchiKey?: string
}

async function postCompounds(body: Record<string, unknown>): Promise<UniChemApiCompound[]> {
  try {
    const res = await fetch(`${UNICHEM_API}/compounds`, {
      ...fetchOptions,
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return []
    const data = await res.json()
    // Response shapes: { compounds: [...] } or plain array
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.compounds)) return data.compounds
    if (Array.isArray(data?.response)) return data.response
    return []
  } catch {
    return []
  }
}

/** Coarse category for denser list chips (free public UniChem sources). */
export function unichemSourceCategory(
  sourceName: string,
  sourceId?: string,
): string {
  const key = normalizeSourceKey(sourceName, sourceId)
  if (
    ['chembl', 'drugbank', 'drugcentral', 'pharmgkb', 'iuphar', 'gtopdb', 'surechembl'].includes(
      key,
    )
  ) {
    return 'drug'
  }
  if (['hmdb', 'metabolights', 'swisslipids', 'foodb'].includes(key)) {
    return 'metabolomics'
  }
  if (['pdb', 'pdbe', 'rcsb'].includes(key)) {
    return 'structure'
  }
  if (['bindingdb', 'lincs', 'pubchem_bioassay'].includes(key)) {
    return 'assay'
  }
  if (
    ['pubchem', 'chebi', 'zinc', 'kegg_ligand', 'kegg', 'mcule', 'emolecules', 'comptox', 'nmrshiftdb2'].includes(
      key,
    )
  ) {
    return 'chemistry'
  }
  return 'other'
}

function friendlySourceName(sourceName: string, sourceId: string): string {
  const short = SOURCE_ID_NAMES[sourceId]
  if (short && (!sourceName || sourceName === sourceId || /^\d+$/.test(sourceName))) {
    return short
  }
  return sourceName || short || sourceId || 'source'
}

function mapApiSources(sources: UniChemApiSource[]): UniChemMapping[] {
  const out: UniChemMapping[] = []
  const seen = new Set<string>()
  for (const s of sources) {
    const sourceId = String(s.sourceID ?? s.src_id ?? '')
    const fullName = String(s.nameLong || s.nameLabel || s.name || '').trim()
    const shortName = String(
      s.shortName || SOURCE_ID_NAMES[sourceId] || s.nameLabel || s.name || sourceId,
    ).trim()
    const sourceName = friendlySourceName(shortName || fullName, sourceId)
    const externalId = String(s.src_compound_id ?? s.compoundId ?? s.id ?? '').trim()
    if (!externalId) continue
    const key = `${sourceId}|${externalId}`
    if (seen.has(key)) continue
    seen.add(key)
    const url = resolveUrl(sourceName, externalId, sourceId, s.url || s.srcUrl, s.baseIdUrl)
    out.push({
      sourceId,
      sourceName,
      externalId,
      url,
      sourceFullName: fullName && fullName !== sourceName ? fullName : undefined,
      sourceCategory: unichemSourceCategory(sourceName, sourceId),
    })
  }
  return out
}

/**
 * Get UniChem sources (v1).
 */
export async function getUniChemSources(): Promise<UniChemSource[]> {
  try {
    const res = await fetch(`${UNICHEM_API}/sources/`, { ...fetchOptions, headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : data?.sources ?? []
    return list.map((source: Record<string, unknown>) => ({
      sourceId: String(source.sourceID ?? source.src_id ?? ''),
      name: String(source.name || source.nameLabel || ''),
      fullName: String(source.nameLong || source.name_long || source.nameLabel || ''),
      url: String(source.baseIdUrl || source.srcUrl || source.url || ''),
      description: String(source.description || ''),
    }))
  } catch (error) {
    console.error('UniChem sources fetch error:', error)
    return []
  }
}

/**
 * Get cross-references for a compound by InChIKey (UniChem 2.0 POST API).
 */
export async function getUniChemMappings(inchiKey: string): Promise<UniChemMapping[]> {
  try {
    const key = (inchiKey || '').trim()
    if (!key) return []
    const compounds = await postCompounds({ type: 'inchikey', compound: key })
    const mappings: UniChemMapping[] = []
    for (const c of compounds) {
      mappings.push(...mapApiSources(c.sources ?? []))
    }
    return mappings
  } catch (error) {
    console.error('UniChem mappings fetch error:', error)
    return []
  }
}

/**
 * Get cross-references from one database identifier.
 * Example: PubChem CID → all UniChem sources.
 */
export async function getUniChemCrossRefs(
  fromSource: string,
  fromId: string,
  /** Reserved for future to-source filtering (API currently returns all sources). */
  toSource?: string,
): Promise<UniChemMapping[]> {
  void toSource
  try {
    const sourceNum = resolveSourceNumber(fromSource)
    if (sourceNum == null) return []
    const compounds = await postCompounds({
      type: 'sourceID',
      sourceID: sourceNum,
      compound: String(fromId),
    })
    const mappings: UniChemMapping[] = []
    for (const c of compounds) {
      mappings.push(...mapApiSources(c.sources ?? []))
    }
    // Always include the query identity with a proper deep link
    if (!mappings.some((m) => m.externalId === String(fromId))) {
      mappings.unshift({
        sourceId: String(sourceNum),
        sourceName: SOURCE_ID_NAMES[String(sourceNum)] || fromSource,
        externalId: String(fromId),
        url: unichemMappingDeepLink(fromSource, String(fromId), String(sourceNum)),
      })
    }
    return mappings
  } catch (error) {
    console.error('UniChem cross-refs fetch error:', error)
    return []
  }
}

function resolveSourceNumber(source: string): number | null {
  const s = source.trim().toLowerCase()
  if (/^\d+$/.test(s)) return Number(s)
  for (const [id, name] of Object.entries(SOURCE_ID_NAMES)) {
    if (name === s || s.includes(name) || name.includes(s)) return Number(id)
  }
  if (s.includes('pubchem')) return 22
  if (s.includes('chembl')) return 1
  if (s.includes('drugbank')) return 2
  if (s.includes('chebi')) return 7
  return null
}

/**
 * Resolve a compound identifier to InChIKey via UniChem 2.0.
 */
export async function resolveToInChIKey(source: string, id: string): Promise<string | null> {
  try {
    const sourceNum = resolveSourceNumber(source)
    if (sourceNum == null) return null
    const compounds = await postCompounds({
      type: 'sourceID',
      sourceID: sourceNum,
      compound: String(id),
    })
    const first = compounds[0]
    return first?.standardInchiKey || first?.inchiKey || null
  } catch (error) {
    console.error('UniChem resolve error:', error)
    return null
  }
}

/**
 * Get all database IDs for a compound given one identifier.
 * Convenience function that combines resolve + mappings.
 */
export async function getAllCompoundIds(
  source: string,
  id: string,
): Promise<{
  inchiKey: string | null
  mappings: Record<string, string>
  mappingList: UniChemMapping[]
}> {
  const mappingList = await getUniChemCrossRefs(source, id)
  const inchiKey = await resolveToInChIKey(source, id)
  const mappings: Record<string, string> = { [source]: id }

  for (const ref of mappingList) {
    if (ref.sourceName && ref.externalId) {
      mappings[ref.sourceName] = ref.externalId
    }
  }

  return { inchiKey, mappings, mappingList }
}
