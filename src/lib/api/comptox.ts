import type { CompToxData } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface CompToxSearchResult {
  dtxsid: string
  dtxcid: string
  searchWord: string
  searchMatch: string
  rank: number
  hasStructureImage: boolean
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

export async function getCompToxByName(name: string): Promise<CompToxData | null> {
  try {
    const searchRes = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with/${encodeURIComponent(name)}`,
      fetchOptions,
    )
    if (!searchRes.ok) return null
    const searchData: CompToxSearchResult[] = await searchRes.json()
    const firstResult = searchData.find(r =>
      r.searchWord.toLowerCase() === name.toLowerCase() || r.searchMatch === 'Approved Name'
    ) || searchData[0]
    if (!firstResult) return null

    const dtxsid = firstResult.dtxsid
    if (!dtxsid) return null

    let molecularFormula = ''
    let molecularWeight = 0
    let synonyms: string[] = [firstResult.searchWord]
    let casNumber = ''

    try {
      const propRes = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,InChIKey,CanonicalSMILES/JSON`,
        fetchOptions,
      )
      if (propRes.ok) {
        const propData: PubChemPropertyResult = await propRes.json()
        const props = propData.PropertyTable.Properties[0]
        if (props) {
          molecularFormula = props.MolecularFormula || ''
          molecularWeight = parseFloat(props.MolecularWeight) || 0
        }
      }
    } catch {}

    try {
      const synRes = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/synonyms/JSON`,
        fetchOptions,
      )
      if (synRes.ok) {
        const synData: PubChemSynonymsResult = await synRes.json()
        const synInfo = synData.InformationList.Information[0]
        if (synInfo?.Synonym) {
          synonyms = synInfo.Synonym.slice(0, 20)
          const casSyn = synInfo.Synonym.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s))
          if (casSyn) casNumber = casSyn
        }
      }
    } catch {}

    return {
      dtxsid,
      chemicalName: firstResult.searchWord || name,
      casrn: casNumber,
      casNumber,
      molecularFormula,
      molecularWeight,
      structureUrl: firstResult.hasStructureImage
        ? `https://comptox.epa.gov/dashboard-api/ccdapp1/chemical/image/${dtxsid}`
        : '',
      synonyms,
      toxcastTotal: 0,
      toxcastActive: 0,
      url: `https://comptox.epa.gov/dashboard/chemical/details/${dtxsid}`,
    }
  } catch {
    return null
  }
}