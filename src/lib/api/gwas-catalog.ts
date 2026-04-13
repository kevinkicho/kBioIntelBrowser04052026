import type { GwasAssociation } from '../types'

const SEARCH_URL = 'https://www.ebi.ac.uk/gwas/api/search'
const REST_URL = 'https://www.ebi.ac.uk/gwas/rest/api'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

async function searchTraits(query: string, maxResults = 10): Promise<Array<{ trait: string; efoUri: string }>> {
  try {
    const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []
    const seen = new Set<string>()
    const traits: Array<{ trait: string; efoUri: string }> = []

    for (const doc of docs) {
      if (doc.resourcename !== 'trait') continue
      const trait = String(doc.mappedTrait ?? doc.title ?? doc.reportedTrait_s ?? '')
      const efoLinks = doc.efoLink as string[] | undefined
      const uris = (doc.mappedUri ?? doc.shortForm) as string | string[] | undefined
      let efoUri = ''

      if (Array.isArray(uris) && uris.length > 0) {
        efoUri = String(uris[0])
      } else if (typeof uris === 'string') {
        efoUri = uris
      } else if (Array.isArray(efoLinks) && efoLinks.length > 0) {
        const parts = String(efoLinks[0]).split('|')
        if (parts.length >= 3) efoUri = parts[2]
      }

      if (trait && !seen.has(trait)) {
        seen.add(trait)
        traits.push({ trait, efoUri })
      }
    }
    return traits
  } catch {
    return []
  }
}

async function fetchAssociationsByEfo(efoUri: string, size = 10): Promise<GwasAssociation[]> {
  try {
    const efoId = efoUri.split('/').pop() ?? ''
    if (!efoId) return []

    const url = `${REST_URL}/efoTraits/${efoId}/associations?projection=search&page=0&size=${size}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const associations = data?._embedded?.associations ?? []

    return associations.slice(0, size).map((assoc: Record<string, unknown>) => {
      const loci = (assoc.loci ?? []) as Record<string, unknown>[]
      const firstLocus = loci[0] ?? {}
      const riskAlleles = (firstLocus.strongestRiskAlleles ?? []) as Record<string, unknown>[]
      const riskAllele = riskAlleles.length > 0 ? String(riskAlleles[0].riskAlleleName ?? '') : ''
      const genes = (firstLocus.authorReportedGenes ?? []) as Record<string, unknown>[]
      const geneSymbol = genes.length > 0 ? String(genes[0].geneName ?? '') : ''

      return {
        traitName: '',
        geneSymbol: geneSymbol,
        pValue: Number(assoc.pvalue) || 0,
        riskAllele,
        region: '',
        studyId: String(assoc.accessionId ?? ''),
        pubmedId: '',
        url: `https://www.ebi.ac.uk/gwas/associations/${assoc.accessionId ?? ''}`,
      }
    })
  } catch {
    return []
  }
}

async function fetchStudiesByDiseaseTrait(diseaseTrait: string, size = 10): Promise<GwasAssociation[]> {
  try {
    const url = `${REST_URL}/studies/search/findByDiseaseTrait?diseaseTrait=${encodeURIComponent(diseaseTrait)}&size=${size}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const studies = data?._embedded?.studies ?? []

    return studies.slice(0, size).map((study: Record<string, unknown>) => {
      const diseaseTraitObj = study.diseaseTrait as Record<string, unknown> | null
      const riskAlleles = study.strongestSnpRiskAlleles as Record<string, unknown>[] | undefined

      return {
        traitName: (diseaseTraitObj?.trait as string) ?? '',
        pValue: Number(study.pvalue) || 0,
        riskAllele: (riskAlleles?.[0]?.riskAlleleName as string) ?? '',
        geneSymbol: '',
        region: (study.chromosomeName as string) ?? '',
        studyId: (study.accessionId as string) ?? '',
        pubmedId: (study.pubmedId as string) ?? '',
        url: `https://www.ebi.ac.uk/gwas/studies/${study.accessionId ?? ''}`,
      }
    })
  } catch {
    return []
  }
}

export async function getGwasAssociationsByName(name: string): Promise<GwasAssociation[]> {
  try {
    const traits = await searchTraits(name, 3)
    const allAssociations: GwasAssociation[] = []
    const seen = new Set<string>()

    for (const { trait, efoUri } of traits) {
      if (allAssociations.length >= 10) break
      const efoId = efoUri.split('/').pop() ?? ''
      let associations: GwasAssociation[] = []

      if (efoId) {
        associations = await fetchAssociationsByEfo(efoUri, 10)
      }
      if (associations.length === 0) {
        associations = await fetchStudiesByDiseaseTrait(trait, 10)
      }

      for (const assoc of associations) {
        if (!assoc.traitName) assoc.traitName = trait
        const key = `${assoc.traitName}|${assoc.riskAllele}|${assoc.pValue}`
        if (!seen.has(key)) {
          seen.add(key)
          allAssociations.push(assoc)
        }
        if (allAssociations.length >= 10) break
      }
    }

    if (allAssociations.length === 0) {
      return await fetchStudiesByDiseaseTrait(name, 10)
    }

    allAssociations.sort((a, b) => {
      if (a.pValue === 0 && b.pValue === 0) return 0
      if (a.pValue === 0) return 1
      if (b.pValue === 0) return -1
      return a.pValue - b.pValue
    })

    return allAssociations
  } catch {
    return []
  }
}