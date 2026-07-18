import type { CompToxData } from '../types'

const COMPTOX_EQUAL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/equal'
const COMPTOX_START = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with'
const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface CompToxSearchResult {
  dtxsid: string
  dtxcid?: string
  searchWord: string
  searchMatch: string
  rank?: number
  hasStructureImage?: boolean
}

interface PubChemPropertyResult {
  PropertyTable: {
    Properties: {
      CID: number
      MolecularFormula: string
      MolecularWeight: string
      InChIKey: string
      CanonicalSMILES: string
    }[]
  }
}

interface PubChemSynonymsResult {
  InformationList: {
    Information: {
      CID: number
      Synonym: string[]
    }[]
  }
}

async function searchCompTox(name: string): Promise<CompToxSearchResult | null> {
  try {
    let res = await fetch(`${COMPTOX_EQUAL}/${encodeURIComponent(name)}`, fetchOptions)
    let data: CompToxSearchResult[] = res.ok ? await res.json() : []
    if (!Array.isArray(data) || data.length === 0) {
      res = await fetch(`${COMPTOX_START}/${encodeURIComponent(name)}`, fetchOptions)
      if (!res.ok) return null
      data = await res.json()
    }
    if (!Array.isArray(data) || data.length === 0) return null
    return (
      data.find(
        (r) =>
          r.searchWord?.toLowerCase() === name.toLowerCase() ||
          r.searchMatch === 'Approved Name',
      ) || data[0]
    )
  } catch {
    return null
  }
}

/**
 * CompTox public detail/ToxCast count APIs are largely retired (404).
 * We resolve DTXSID via CompTox search and enrich identity from free PubChem PUG.
 * ToxCast active/total stay 0 when unavailable — UI must not imply 0% activity.
 */
export async function getCompToxByName(name: string): Promise<CompToxData | null> {
  try {
    const firstResult = await searchCompTox(name)
    if (!firstResult?.dtxsid) return null

    const dtxsid = firstResult.dtxsid
    let molecularFormula = ''
    let molecularWeight = 0
    let synonyms: string[] = [firstResult.searchWord].filter(Boolean)
    let casNumber = ''
    let pubchemCid: number | null = null
    let structureUrl = ''

    try {
      const propRes = await fetch(
        `${PUBCHEM_PUG}/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,InChIKey,CanonicalSMILES/JSON`,
        fetchOptions,
      )
      if (propRes.ok) {
        const propData: PubChemPropertyResult = await propRes.json()
        const props = propData.PropertyTable?.Properties?.[0]
        if (props) {
          molecularFormula = props.MolecularFormula || ''
          molecularWeight = parseFloat(props.MolecularWeight) || 0
          pubchemCid = props.CID ?? null
          if (pubchemCid) {
            structureUrl = `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${pubchemCid}&t=l`
          }
        }
      }
    } catch {
      /* optional */
    }

    try {
      const synRes = await fetch(
        `${PUBCHEM_PUG}/compound/name/${encodeURIComponent(name)}/synonyms/JSON`,
        fetchOptions,
      )
      if (synRes.ok) {
        const synData: PubChemSynonymsResult = await synRes.json()
        const synInfo = synData.InformationList?.Information?.[0]
        if (synInfo?.Synonym?.length) {
          synonyms = synInfo.Synonym.slice(0, 20)
          const casSyn = synInfo.Synonym.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s))
          if (casSyn) casNumber = casSyn
          if (!pubchemCid && synInfo.CID) {
            structureUrl = `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${synInfo.CID}&t=l`
          }
        }
      }
    } catch {
      /* optional */
    }

    return {
      dtxsid,
      chemicalName: firstResult.searchWord || name,
      casrn: casNumber,
      casNumber,
      molecularFormula,
      molecularWeight,
      structureUrl,
      synonyms,
      // Not available from free CompTox search-only API (detail/ToxCast endpoints 404)
      toxcastTotal: 0,
      toxcastActive: 0,
      toxcastAvailable: false,
      url: `https://comptox.epa.gov/dashboard/chemical/details/${dtxsid}`,
    }
  } catch {
    return null
  }
}
