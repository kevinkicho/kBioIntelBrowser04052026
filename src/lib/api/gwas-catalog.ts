import type { GwasAssociation } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search GWAS Catalog for studies related to a trait/disease
 * Updated endpoint to use the correct GWAS Catalog REST API
 */
export async function getGwasAssociationsByName(name: string): Promise<GwasAssociation[]> {
  try {
    // Try the new GWAS Catalog API endpoint
    // Search for studies by trait
    const url = `https://www.ebi.ac.uk/gwas/rest/api/efoTraits/search/findByEfoTrait?efoTrait=${encodeURIComponent(name)}`
    const res = await fetch(url, fetchOptions)
    
    if (!res.ok) {
      // Fallback: search by keyword
      return await searchByKeyword(name)
    }
    
    const data = await res.json()
    const studies = data?._embedded?.studies ?? []
    
    if (studies.length === 0) {
      // Try keyword search if no EFO trait results
      return await searchByKeyword(name)
    }
    
    return mapStudiesToAssociations(studies, name)
  } catch {
    // Final fallback to keyword search
    return await searchByKeyword(name)
  }
}

/**
 * Search GWAS Catalog by keyword (broader search)
 */
async function searchByKeyword(keyword: string): Promise<GwasAssociation[]> {
  try {
    // Use the search endpoint with disease trait parameter
    const url = `https://www.ebi.ac.uk/gwas/rest/api/studies/search/findByDiseaseTrait?diseaseTrait=${encodeURIComponent(keyword)}&size=10`
    const res = await fetch(url, fetchOptions)
    
    if (!res.ok) {
      // Try the generic search endpoint
      return await genericSearch(keyword)
    }
    
    const data = await res.json()
    const studies = data?._embedded?.studies ?? []
    
    return mapStudiesToAssociations(studies, keyword)
  } catch {
    return []
  }
}

/**
 * Generic search across GWAS Catalog
 */
async function genericSearch(query: string): Promise<GwasAssociation[]> {
  try {
    // Use the studies endpoint with filtering
    const url = `https://www.ebi.ac.uk/gwas/rest/api/studies?diseaseTrait=${encodeURIComponent(query)}&size=10`
    const res = await fetch(url, fetchOptions)
    
    if (!res.ok) return []
    
    const data = await res.json()
    const studies = data?._embedded?.studies ?? []
    
    return mapStudiesToAssociations(studies, query)
  } catch {
    return []
  }
}

/**
 * Map GWAS Catalog study data to our GwasAssociation type
 */
function mapStudiesToAssociations(
  studies: Record<string, unknown>[], 
  originalQuery: string
): GwasAssociation[] {
  return studies.slice(0, 10).map((study) => {
    const diseaseTrait = study.diseaseTrait as Record<string, unknown> | null
    const riskAlleles = study.strongestSnpRiskAlleles as Record<string, unknown>[] | undefined
    
    return {
      traitName: (diseaseTrait?.trait as string) ?? originalQuery,
      pValue: Number(study.pvalue) || 0,
      riskAllele: (riskAlleles?.[0]?.riskAlleleName as string) ?? '',
      region: (study.chromosomeName as string) ?? '',
      studyId: (study.accessionId as string) ?? '',
      geneSymbol: '',
      pubmedId: (study.pubmedId as string) ?? '',
      url: `https://www.ebi.ac.uk/gwas/search?query=${encodeURIComponent(originalQuery)}`,
    }
  })
}

/**
 * Get associations by EFO trait URI (more precise search)
 */
export async function getGwasAssociationsByTrait(traitUri: string): Promise<GwasAssociation[]> {
  try {
    const url = `https://www.ebi.ac.uk/gwas/rest/api/studies/search/findByEfoTrait?efoTrait=${encodeURIComponent(traitUri)}&size=10`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    
    const data = await res.json()
    const studies = data?._embedded?.studies ?? []
    
    return mapStudiesToAssociations(studies, traitUri)
  } catch {
    return []
  }
}
