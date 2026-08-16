import type { MetaboLightsStudy, MetaboLightsMetabolite } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.ebi.ac.uk/metabolights/ws'
const EBI_SEARCH_URL = 'https://www.ebi.ac.uk/ebisearch/ws/rest/metabolights'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * MetaboLights harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains []. MetaboLights WS 5xx falls through
 * to EBI Search; if that fallback also fails, the error is thrown.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function asHttpError(e: unknown): Error & { status?: number } {
  return e instanceof Error ? e : new Error(String(e))
}

export async function searchMetaboLights(query: string, limit: number = LIMITS.METABOLIGHTS.initial): Promise<MetaboLightsStudy[]> {
  let primaryError: (Error & { status?: number }) | null = null
  try {
    const searchUrl = `${BASE_URL}/studies/search?query=${encodeURIComponent(query)}&size=${limit}`
    const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
    if (!isAbsentStatus(searchRes.status)) {
      throwIfHttpFailed(searchRes, 'MetaboLights')
      const searchData = await searchRes.json()
      const studies = searchData?._embedded?.studies || searchData?.studies || searchData?.content || []
      if (Array.isArray(studies) && studies.length > 0) {
        return mapStudies(studies, limit)
      }
    }
  } catch (e) {
    primaryError = asHttpError(e)
  }

  try {
    const ebi = await searchViaEbi(query, limit)
    if (ebi.length > 0) return ebi
    if (primaryError) throw primaryError
    return []
  } catch (e) {
    if (primaryError) throw primaryError
    throw e
  }
}

async function searchViaEbi(query: string, limit: number): Promise<MetaboLightsStudy[]> {
  const url = `${EBI_SEARCH_URL}?query=${encodeURIComponent(query)}&size=${limit}&format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'MetaboLights')

  const data = await res.json()
  const entries = data?.entries ?? []

  return entries.map((entry: Record<string, unknown>) => {
    const fields = (entry.fields ?? {}) as Record<string, unknown>
    const acc = String(entry.id ?? entry.accession ?? '')
    return {
      id: acc,
      title: String(fields.title ?? fields.study_title ?? ''),
      description: String(fields.description ?? fields.study_abstract ?? ''),
      studyType: 'Metabolomics',
      organism: String(fields.organism ?? fields.species ?? ''),
      organismPart: '',
      platform: String(fields.platform ?? fields.technology ?? ''),
      metabolites: 0,
      samples: 0,
      techniques: [],
      publication: String(fields.publication ?? ''),
      publicationDate: String(fields.release_date ?? fields.date ?? ''),
      url: `https://www.ebi.ac.uk/metabolights/${acc}`,
    }
  }).filter((s: MetaboLightsStudy) => s.id && s.title)
}

function mapStudies(studies: unknown[], limit: number): MetaboLightsStudy[] {
  return (studies as Record<string, unknown>[]).map((study) => ({
    id: String(study.accession || study.mtblsId || study.studyId || ''),
    title: String(study.title || study.studyTitle || ''),
    description: String(study.description || study.studyAbstract || ''),
    studyType: String(study.studyType || study.design_type || 'Metabolomics'),
    organism: String(study.organism || study.species || ''),
    organismPart: String(study.organism_part || study.organismPart || study.tissue || ''),
    platform: String(study.platform || study.technology || ''),
    metabolites: parseInt(String(study.metabolite_count || study.metabolites || '0'), 10),
    samples: parseInt(String(study.sample_count || study.samples || '0'), 10),
    techniques: Array.isArray(study.techniques) ? study.techniques.map(String) : String(study.techniques || '').split(',').map(s => s.trim()).filter(Boolean),
    publication: String(study.publication || study.publication_title || ''),
    publicationDate: String(study.release_date || study.publicationDate || study.date || ''),
    url: `https://www.ebi.ac.uk/metabolights/${study.accession || study.mtblsId || ''}`,
  })).filter((s: MetaboLightsStudy) => s.id && s.title).slice(0, limit)
}

export async function getMetaboLightsStudy(accession: string): Promise<MetaboLightsStudy | null> {
  if (!accession?.trim()) return null
  const studyUrl = `${BASE_URL}/studies/${accession}`
  const studyRes = await timedFetch(studyUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(studyRes.status)) return null
  throwIfHttpFailed(studyRes, 'MetaboLights')

  const study = await studyRes.json()

  return {
    id: study.accession || accession,
    title: study.title || study.studyTitle || '',
    description: study.description || study.studyAbstract || '',
    studyType: study.studyType || study.design_type || 'Metabolomics',
    organism: study.organism || study.species || '',
    organismPart: study.organism_part || study.organismPart || study.tissue || '',
    platform: study.platform || study.technology || '',
    metabolites: parseInt(String(study.metabolite_count || study.metabolites || '0'), 10),
    samples: parseInt(String(study.sample_count || study.samples || '0'), 10),
    techniques: Array.isArray(study.techniques) ? study.techniques.map(String) : String(study.techniques || '').split(',').map(s => s.trim()).filter(Boolean),
    publication: study.publication || study.publication_title || '',
    publicationDate: study.release_date || study.publicationDate || study.date || '',
    url: `https://www.ebi.ac.uk/metabolights/${accession}`,
  }
}

export async function searchMetaboLightsMetabolites(query: string, limit: number = LIMITS.METABOLIGHTS.initial): Promise<MetaboLightsMetabolite[]> {
  const searchUrl = `${BASE_URL}/metabolites/search?query=${encodeURIComponent(query)}&size=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'MetaboLights')

  const searchData = await searchRes.json()
  const metabolites = searchData?._embedded?.metabolites || searchData?.metabolites || searchData?.content || []

  return metabolites.map((met: Record<string, unknown>) => ({
    id: String(met.accession || met.metaboliteId || ''),
    name: String(met.name || met.chemical_name || ''),
    formula: String(met.formula || met.chemical_formula || ''),
    inchi: String(met.inchi || ''),
    inchiKey: String(met.inchi_key || met.inchiKey || ''),
    chebiId: String(met.chebi_id || met.chebiId || ''),
    hmdbId: String(met.hmdb_id || met.hmdbId || ''),
    smiles: String(met.smiles || ''),
    mass: parseFloat(String(met.mass || met.exact_mass || '0')),
    databaseLinks: Array.isArray(met.database_links) ? met.database_links.map((dl: Record<string, unknown>) => ({
      database: String(dl.database || dl.name || ''),
      ids: Array.isArray(dl.ids) ? dl.ids.map(String) : [String(dl.id || '')].filter(Boolean),
    })) : [],
    url: `https://www.ebi.ac.uk/metabolights/${met.accession || met.metaboliteId || ''}`,
  })).filter((m: MetaboLightsMetabolite) => m.id && m.name)
}

export async function getMetaboLightsMetabolite(metaboliteId: string): Promise<MetaboLightsMetabolite | null> {
  if (!metaboliteId?.trim()) return null
  const metUrl = `${BASE_URL}/metabolites/${metaboliteId}`
  const metRes = await timedFetch(metUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(metRes.status)) return null
  throwIfHttpFailed(metRes, 'MetaboLights')

  const met = await metRes.json()

  return {
    id: met.accession || metaboliteId,
    name: met.name || met.chemical_name || '',
    formula: met.formula || met.chemical_formula || '',
    inchi: met.inchi || '',
    inchiKey: met.inchi_key || met.inchiKey || '',
    chebiId: met.chebi_id || met.chebiId || '',
    hmdbId: met.hmdb_id || met.hmdbId || '',
    smiles: met.smiles || '',
    mass: parseFloat(String(met.mass || met.exact_mass || '0')),
    databaseLinks: Array.isArray(met.database_links) ? met.database_links.map((dl: Record<string, unknown>) => ({
      database: String(dl.database || dl.name || ''),
      ids: Array.isArray(dl.ids) ? dl.ids.map(String) : [String(dl.id || '')].filter(Boolean),
    })) : [],
    url: `https://www.ebi.ac.uk/metabolights/${met.accession || metaboliteId}`,
  }
}