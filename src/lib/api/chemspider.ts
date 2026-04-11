import type { ChemSpiderCompound } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.rsc.org/compounds/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search ChemSpider for chemical compounds
 * ChemSpider is a chemical structure database by the Royal Society of Chemistry
 */
export async function searchChemSpider(query: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  try {
    // ChemSpider search endpoint
    const searchUrl = `${BASE_URL}/search?name=${encodeURIComponent(query)}&count=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.records || []

    return results.map((compound: Record<string, unknown>) => ({
      id: String(compound.id || compound.csid || ''),
      csId: String(compound.csid || compound.CSID || compound.csId || compound.id || ''),
      name: String(compound.name || compound.common_name || compound.iupac_name || ''),
      synonyms: Array.isArray(compound.synonyms) ? compound.synonyms.map(String) : [],
      formula: String(compound.formula || compound.molecular_formula || ''),
      molecularWeight: parseFloat(String(compound.mw || compound.molecular_weight || compound.molWeight || '0')),
      inChI: String(compound.inchi || compound.InChI || ''),
      inChIKey: String(compound.inchikey || compound.InChIKey || ''),
      smiles: String(compound.smiles || compound.SMILES || ''),
      sources: Array.isArray(compound.sources) ? compound.sources.map(String) : [],
      image2D: `https://www.chemspider.com/Images-Thumb/${compound.csid || compound.csId || compound.id}/thumb.png`,
      image3D: '',
      url: `https://www.chemspider.com/Chemical-Structure.${compound.csid || compound.csId || compound.id}.html`,
    })).filter((c: ChemSpiderCompound) => c.csId && c.name)
  } catch (error) {
    console.error('ChemSpider search error:', error)
    return []
  }
}

/**
 * Get ChemSpider compound details by CSID
 */
export async function getChemSpiderCompound(csid: string): Promise<ChemSpiderCompound | null> {
  try {
    const compoundUrl = `${BASE_URL}/records/${csid}`
    const compoundRes = await fetch(compoundUrl, fetchOptions)
    if (!compoundRes.ok) return null

    const compound = await compoundRes.json()

    return {
      id: String(compound.id || csid),
      csId: String(compound.csid || compound.CSID || csid),
      name: String(compound.name || compound.common_name || compound.iupac_name || ''),
      synonyms: Array.isArray(compound.synonyms) ? compound.synonyms.map(String) : [],
      formula: String(compound.formula || compound.molecular_formula || ''),
      molecularWeight: parseFloat(String(compound.mw || compound.molecular_weight || '0')),
      inChI: String(compound.inchi || compound.InChI || ''),
      inChIKey: String(compound.inchikey || compound.InChIKey || ''),
      smiles: String(compound.smiles || compound.SMILES || ''),
      sources: Array.isArray(compound.sources) ? compound.sources.map(String) : [],
      image2D: `https://www.chemspider.com/Images-Thumb/${csid}/thumb.png`,
      image3D: `https://www.chemspider.com/Images-3D/${csid}/3d.png`,
      url: `https://www.chemspider.com/Chemical-Structure.${csid}.html`,
    }
  } catch (error) {
    console.error('ChemSpider compound fetch error:', error)
    return null
  }
}

/**
 * Search ChemSpider by InChIKey
 */
export async function searchChemSpiderByInChIKey(inchikey: string): Promise<ChemSpiderCompound | null> {
  try {
    const searchUrl = `${BASE_URL}/search?inchikey=${encodeURIComponent(inchikey)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const result = searchData?.results?.[0] || searchData?.records?.[0]

    if (!result) return null

    return {
      id: String(result.id || result.csid || ''),
      csId: String(result.csid || result.CSID || result.csId || result.id || ''),
      name: String(result.name || result.common_name || result.iupac_name || ''),
      synonyms: Array.isArray(result.synonyms) ? result.synonyms.map(String) : [],
      formula: String(result.formula || result.molecular_formula || ''),
      molecularWeight: parseFloat(String(result.mw || result.molecular_weight || '0')),
      inChI: String(result.inchi || result.InChI || ''),
      inChIKey: inchikey,
      smiles: String(result.smiles || result.SMILES || ''),
      sources: Array.isArray(result.sources) ? result.sources.map(String) : [],
      image2D: `https://www.chemspider.com/Images-Thumb/${result.csid || result.csId || result.id}/thumb.png`,
      image3D: '',
      url: `https://www.chemspider.com/Chemical-Structure.${result.csid || result.csId || result.id}.html`,
    }
  } catch (error) {
    console.error('ChemSpider InChIKey search error:', error)
    return null
  }
}

/**
 * Search ChemSpider by SMILES
 */
export async function searchChemSpiderBySMILES(smiles: string, limit: number = LIMITS.CHEMSPIDER.initial): Promise<ChemSpiderCompound[]> {
  try {
    const searchUrl = `${BASE_URL}/search?smiles=${encodeURIComponent(smiles)}&count=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.records || []

    return results.map(formatCompound)
  } catch (error) {
    console.error('ChemSpider SMILES search error:', error)
    return []
  }
}

function formatCompound(compound: Record<string, unknown>): ChemSpiderCompound {
  return {
    id: String(compound.id || compound.csid || ''),
    csId: String(compound.csid || compound.CSID || compound.csId || compound.id || ''),
    name: String(compound.name || compound.common_name || compound.iupac_name || ''),
    synonyms: Array.isArray(compound.synonyms) ? compound.synonyms.map(String) : [],
    formula: String(compound.formula || compound.molecular_formula || ''),
    molecularWeight: parseFloat(String(compound.mw || compound.molecular_weight || '0')),
    inChI: String(compound.inchi || compound.InChI || ''),
    inChIKey: String(compound.inchikey || compound.InChIKey || ''),
    smiles: String(compound.smiles || compound.SMILES || ''),
    sources: Array.isArray(compound.sources) ? compound.sources.map(String) : [],
    image2D: `https://www.chemspider.com/Images-Thumb/${compound.csid || compound.csId || compound.id}/thumb.png`,
    image3D: '',
    url: `https://www.chemspider.com/Chemical-Structure.${compound.csid || compound.csId || compound.id}.html`,
  }
}