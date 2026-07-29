import type { CTDInteraction, CTDDiseaseAssociation } from '../types'

const BASE_URL = 'https://ctdbase.org'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

/**
 * Search CTD for chemical-gene interactions (legacy report URLs often 404).
 */
export async function getChemicalGeneInteractions(chemicalName: string): Promise<CTDInteraction[]> {
  try {
    const candidates = [
      `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_gene_interaction.json`,
      `http://ctdbase.org/reports/chemical_${encodeURIComponent(chemicalName)}_gene_interaction.json`,
    ]
    for (const url of candidates) {
      try {
        const res = await fetch(url, fetchOptions)
        if (!res.ok) continue
        const data = await res.json()
        const rows = data.data ?? []
        if (!Array.isArray(rows) || rows.length === 0) continue
        return rows.slice(0, 30).map((row: string[]) => ({
          chemicalName: row[0] ?? chemicalName,
          chemicalId: row[1] ?? '',
          geneSymbol: row[2] ?? '',
          geneId: row[3] ?? '',
          interaction: row[4] ?? '',
          interactionActions: (row[5] ?? '').split('|'),
          pmids: (row[6] ?? '').split('|').slice(0, 5),
          source: 'CTD',
        }))
      } catch {
        /* next */
      }
    }
    return []
  } catch {
    return []
  }
}

export async function getGeneDiseaseAssociations(geneSymbol: string): Promise<CTDDiseaseAssociation[]> {
  try {
    const url = `${BASE_URL}/reports/gene_${encodeURIComponent(geneSymbol)}_disease.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const rows = data.data ?? []
    return rows.slice(0, 30).map((row: string[]) => ({
      diseaseName: row[0] ?? '',
      diseaseId: row[1] ?? '',
      geneSymbol: geneSymbol,
      geneId: row[2] ?? '',
      inferenceScore: parseFloat(row[3] ?? '0'),
      pmids: (row[4] ?? '').split('|').slice(0, 5),
      source: 'CTD',
    }))
  } catch {
    return []
  }
}

export async function getChemicalDiseaseAssociations(chemicalName: string): Promise<CTDDiseaseAssociation[]> {
  try {
    const url = `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_disease.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const rows = data.data ?? []
    return rows.slice(0, 30).map((row: string[]) => ({
      diseaseName: row[0] ?? '',
      diseaseId: row[1] ?? '',
      geneSymbol: '',
      geneId: '',
      chemicalName: chemicalName,
      chemicalId: row[2] ?? '',
      inferenceScore: parseFloat(row[3] ?? '0'),
      pmids: (row[4] ?? '').split('|').slice(0, 5),
      source: 'CTD',
    }))
  } catch {
    return []
  }
}

/**
 * Free fallbacks when CTD report endpoints 404:
 * - DGIdb chemical–gene
 * - Open Targets disease associations
 */
async function freeFallbacks(name: string): Promise<{
  interactions: CTDInteraction[]
  diseaseAssociations: CTDDiseaseAssociation[]
}> {
  const interactions: CTDInteraction[] = []
  const diseaseAssociations: CTDDiseaseAssociation[] = []

  try {
    const { getDrugGeneInteractionsByName } = await import('./dgidb')
    const ix = await getDrugGeneInteractionsByName(name)
    for (const i of ix.slice(0, 25)) {
      interactions.push({
        chemicalName: name,
        chemicalId: '',
        geneSymbol: i.geneSymbol || i.geneName || '',
        geneId: '',
        interaction: i.interactionType || 'interacts_with',
        interactionActions: (i.interactionType || '').split(',').map((s) => s.trim()).filter(Boolean),
        pmids: [],
        source: 'DGIdb (CTD fallback)',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    const { getDiseaseAssociationsByName } = await import('./opentargets')
    const hits = await getDiseaseAssociationsByName(name)
    for (const h of hits.slice(0, 20)) {
      diseaseAssociations.push({
        diseaseName: h.diseaseName ?? '',
        diseaseId: h.diseaseId ?? '',
        geneSymbol: '',
        geneId: '',
        chemicalName: name,
        chemicalId: '',
        inferenceScore: Number(h.score) || 0,
        pmids: [],
        source: 'Open Targets (CTD fallback)',
      })
    }
  } catch {
    /* ignore */
  }

  return { interactions, diseaseAssociations }
}

export async function getCTDData(name: string, isGene: boolean = false): Promise<{
  interactions: CTDInteraction[]
  diseaseAssociations: CTDDiseaseAssociation[]
}> {
  const [interactions, diseaseAssociations] = await Promise.all([
    isGene ? Promise.resolve([]) : getChemicalGeneInteractions(name),
    isGene ? getGeneDiseaseAssociations(name) : getChemicalDiseaseAssociations(name),
  ])

  if (interactions.length > 0 || diseaseAssociations.length > 0) {
    return { interactions, diseaseAssociations }
  }

  // CTD report URLs are often dead — free public fallbacks
  return freeFallbacks(name)
}
