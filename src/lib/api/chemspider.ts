import type { ChemSpiderCompound } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const PUBCHEM_SEARCH_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * ChemSpider harvest leaf (PubChem fallback; ChemSpider key optional).
 * HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404, and zero-hit JSON remain empty.
 * PubChem is a cross-source fallback. All-fail throws.
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

function mapPubChemProperties(
  properties: Record<string, unknown>[],
  synMap: Record<number, string[]>,
): ChemSpiderCompound[] {
  return properties.map((prop) => {
    const cid = Number(prop.CID)
    return {
      id: String(cid),
      csId: String(cid),
      name: String(prop.MolecularFormula || ''),
      synonyms: synMap[cid] || [],
      formula: String(prop.MolecularFormula || ''),
      molecularWeight: parseFloat(String(prop.MolecularWeight || '0')),
      inChI: String(prop.InChI || ''),
      inChIKey: String(prop.InChIKey || ''),
      smiles: String(prop.CanonicalSMILES || ''),
      sources: ['PubChem'],
      image2D: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`,
      image3D: '',
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    }
  }).filter((c) => c.csId)
}

async function searchPubChemByName(query: string, limit: number): Promise<ChemSpiderCompound[]> {
  const searchUrl = `${PUBCHEM_SEARCH_URL}/compound/name/${encodeURIComponent(query)}/cids/JSON?MaxRecords=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'PubChem')
  const searchData = await searchRes.json()
  const cids: number[] = searchData?.IdentifierList?.CID ?? []
  if (!cids.length) return []

  const cidsParam = cids.slice(0, limit).join(',')
  const detailUrl = `${PUBCHEM_SEARCH_URL}/compound/cid/${cidsParam}/property/MolecularFormula,MolecularWeight,InChIKey,InChI,CanonicalSMILES/JSON`
  const detailRes = await timedFetch(detailUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(detailRes.status)) return []
  throwIfHttpFailed(detailRes, 'PubChem')
  const detailData = await detailRes.json()
  const properties = detailData?.PropertyTable?.Properties ?? []

  const synUrl = `${PUBCHEM_SEARCH_URL}/compound/cid/${cidsParam}/synonyms/JSON`
  const synMap: Record<number, string[]> = {}
  try {
    const synRes = await timedFetch(synUrl, { ...fetchOptions, timeoutMs: 8000 })
    if (!isAbsentStatus(synRes.status)) {
      throwIfHttpFailed(synRes, 'PubChem')
      const synData = await synRes.json()
      const infoList = synData?.InformationList?.Information ?? []
      for (const info of infoList) {
        if (info.CID && info.Synonym) {
          synMap[info.CID] = (info.Synonym as string[]).slice(0, 20)
        }
      }
    }
  } catch {
    // Synonyms are enrichment only; identity rows still stand.
  }

  return mapPubChemProperties(properties, synMap)
}

async function searchChemSpiderByKey(query: string, limit: number, apiKey: string): Promise<ChemSpiderCompound[]> {
  const filterRes = await timedFetch('https://api.rsc.org/compounds/v1/filter/name', {
    ...fetchOptions,
    method: 'POST',
    timeoutMs: 8000,
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ name: query, count: limit }),
  })
  if (isAbsentStatus(filterRes.status)) return []
  throwIfHttpFailed(filterRes, 'ChemSpider')
  const filterData = await filterRes.json()
  const queryId = filterData.queryId
  if (!queryId) return []

  const resultsRes = await timedFetch(`https://api.rsc.org/compounds/v1/results/${queryId}`, {
    ...fetchOptions,
    timeoutMs: 8000,
    headers: { apikey: apiKey },
  })
  if (isAbsentStatus(resultsRes.status)) return []
  throwIfHttpFailed(resultsRes, 'ChemSpider')
  const resultsData = await resultsRes.json()
  const records = resultsData?.results ?? []
  return records.map((r: Record<string, unknown>) => ({
    id: String(r.id || r.csid || ''),
    csId: String(r.csid || r.CSID || r.id || ''),
    name: String(r.name || r.common_name || ''),
    synonyms: Array.isArray(r.synonyms) ? r.synonyms.map(String) : [],
    formula: String(r.formula || ''),
    molecularWeight: parseFloat(String(r.mw || r.molecular_weight || '0')),
    inChI: String(r.inchi || ''),
    inChIKey: String(r.inchikey || ''),
    smiles: String(r.smiles || ''),
    sources: Array.isArray(r.sources) ? r.sources.map(String) : ['ChemSpider'],
    image2D: `https://www.chemspider.com/Images-Thumb/${r.csid || r.id}/thumb.png`,
    image3D: '',
    url: `https://www.chemspider.com/Chemical-Structure.${r.csid || r.id}.html`,
  })).filter((c: ChemSpiderCompound) => c.csId && c.name).slice(0, limit)
}

export async function searchChemSpider(query: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  const q = (query || '').trim()
  if (!q) return []

  const apiKey = getApiKey('CHEMSPIDER_API_KEY')
  let spiderSawHonestEmpty = false
  if (apiKey) {
    try {
      const rows = await searchChemSpiderByKey(q, limit, apiKey)
      if (rows.length > 0) return rows
      spiderSawHonestEmpty = true
    } catch {
      /* try PubChem */
    }
  }

  try {
    return await searchPubChemByName(q, limit)
  } catch (error) {
    if (spiderSawHonestEmpty) return []
    throw error instanceof Error ? error : new Error('ChemSpider upstream failed')
  }
}

export async function getChemSpiderCompound(csid: string): Promise<ChemSpiderCompound | null> {
  const cid = parseInt(csid, 10)
  if (isNaN(cid)) return null

  const url = `${PUBCHEM_SEARCH_URL}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,InChIKey,InChI,CanonicalSMILES/JSON`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'PubChem')

  const data = await res.json()
  const prop = data?.PropertyTable?.Properties?.[0]
  if (!prop) return null

  return {
    id: String(prop.CID),
    csId: String(prop.CID),
    name: String(prop.MolecularFormula || ''),
    synonyms: [],
    formula: String(prop.MolecularFormula || ''),
    molecularWeight: parseFloat(String(prop.MolecularWeight || '0')),
    inChI: String(prop.InChI || ''),
    inChIKey: String(prop.InChIKey || ''),
    smiles: String(prop.CanonicalSMILES || ''),
    sources: ['PubChem'],
    image2D: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${prop.CID}&t=l`,
    image3D: '',
    url: `https://pubchem.ncbi.nlm.nih.gov/compound/${prop.CID}`,
  }
}

export async function searchChemSpiderByInChIKey(inchikey: string): Promise<ChemSpiderCompound | null> {
  const q = (inchikey || '').trim()
  if (!q) return null
  const url = `${PUBCHEM_SEARCH_URL}/compound/inchikey/${encodeURIComponent(q)}/cids/JSON`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'PubChem')
  const data = await res.json()
  const cid = data?.IdentifierList?.CID?.[0]
  if (!cid) return null

  const compound = await getChemSpiderCompound(String(cid))
  if (compound) compound.inChIKey = q
  return compound
}

export async function searchChemSpiderBySMILES(smiles: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  const q = (smiles || '').trim()
  if (!q) return []
  const url = `${PUBCHEM_SEARCH_URL}/compound/smiles/${encodeURIComponent(q)}/cids/JSON?MaxRecords=${limit}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'PubChem')
  const data = await res.json()
  const cids: number[] = data?.IdentifierList?.CID ?? []
  if (!cids.length) return []

  const compounds = await Promise.all(cids.slice(0, limit).map((cid) => getChemSpiderCompound(String(cid))))
  return compounds.filter((c): c is ChemSpiderCompound => c !== null)
}

