import type { ChemSpiderCompound } from '../types'
import { LIMITS } from '../api-limits'

const PUBCHEM_SEARCH_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

async function searchPubChemByName(query: string, limit: number): Promise<ChemSpiderCompound[]> {
  const searchUrl = `${PUBCHEM_SEARCH_URL}/compound/name/${encodeURIComponent(query)}/cids/JSON?MaxRecords=${limit}`
  const searchRes = await fetch(searchUrl, fetchOptions)
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  const cids: number[] = searchData?.IdentifierList?.CID ?? []
  if (!cids.length) return []

  const cidsParam = cids.slice(0, limit).join(',')
  const detailUrl = `${PUBCHEM_SEARCH_URL}/compound/cid/${cidsParam}/property/MolecularFormula,MolecularWeight,InChIKey,InChI,CanonicalSMILES/JSON`
  const detailRes = await fetch(detailUrl, fetchOptions)
  if (!detailRes.ok) return []
  const detailData = await detailRes.json()
  const properties = detailData?.PropertyTable?.Properties ?? []

  const synUrl = `${PUBCHEM_SEARCH_URL}/compound/cid/${cidsParam}/synonyms/JSON`
  const synMap: Record<number, string[]> = {}
  try {
    const synRes = await fetch(synUrl, fetchOptions)
    if (synRes.ok) {
      const synData = await synRes.json()
      const infoList = synData?.InformationList?.Information ?? []
      for (const info of infoList) {
        if (info.CID && info.Synonym) {
          synMap[info.CID] = (info.Synonym as string[]).slice(0, 20)
        }
      }
    }
  } catch {}

  return properties.map((prop: Record<string, unknown>) => {
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
  }).filter((c: ChemSpiderCompound) => c.csId)
}

export async function searchChemSpider(query: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  try {
    const apiKey = process.env.CHEMSPIDER_API_KEY
    if (apiKey) {
      const filterRes = await fetch('https://api.rsc.org/compounds/v1/filter/name', {
        ...fetchOptions,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ name: query, count: limit }),
      })
      if (filterRes.ok) {
        const filterData = await filterRes.json()
        const queryId = filterData.queryId
        if (queryId) {
          const resultsRes = await fetch(`https://api.rsc.org/compounds/v1/results/${queryId}`, {
            ...fetchOptions,
            headers: { apikey: apiKey },
          })
          if (resultsRes.ok) {
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
        }
      }
    }

    return await searchPubChemByName(query, limit)
  } catch {
    return []
  }
}

export async function getChemSpiderCompound(csid: string): Promise<ChemSpiderCompound | null> {
  try {
    const cid = parseInt(csid, 10)
    if (isNaN(cid)) return null

    const url = `${PUBCHEM_SEARCH_URL}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,InChIKey,InChI,CanonicalSMILES/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null

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
  } catch {
    return null
  }
}

export async function searchChemSpiderByInChIKey(inchikey: string): Promise<ChemSpiderCompound | null> {
  try {
    const url = `${PUBCHEM_SEARCH_URL}/compound/inchikey/${encodeURIComponent(inchikey)}/cids/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const cid = data?.IdentifierList?.CID?.[0]
    if (!cid) return null

    const compound = await getChemSpiderCompound(String(cid))
    if (compound) compound.inChIKey = inchikey
    return compound
  } catch {
    return null
  }
}

export async function searchChemSpiderBySMILES(smiles: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  try {
    const url = `${PUBCHEM_SEARCH_URL}/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON?MaxRecords=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const cids: number[] = data?.IdentifierList?.CID ?? []
    if (!cids.length) return []

    const compounds = await Promise.all(cids.slice(0, limit).map(cid => getChemSpiderCompound(String(cid))))
    return compounds.filter((c): c is ChemSpiderCompound => c !== null)
  } catch {
    return []
  }
}