import type { PharmGKBDrug, PharmGKBGene, PharmGKBGuideline, PharmGKBGeneAssociation, PharmGKBRecommendation, PharmGKBVariant, PharmGKBDrugAssociation } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.pharmgkb.org/v1/data'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search PharmGKB for drug information
 * Returns pharmacogenomic data including gene-drug interactions
 */
export async function searchPharmGKBDrug(query: string, limit: number = LIMITS.PHARMGKB.initial): Promise<PharmGKBDrug[]> {
  try {
    const searchUrl = `${BASE_URL}/drug?name=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const drugs = searchData?.data || []

    return drugs.map((drug: Record<string, unknown>) => ({
      id: String(drug.id || ''),
      name: String(drug.name || ''),
      genericNames: Array.isArray(drug.genericNames) ? drug.genericNames.map(String) : [],
      brandNames: Array.isArray(drug.brandNames) ? drug.brandNames.map(String) : [],
      drugClass: String(drug.drugClass || ''),
      fdaApproval: String(drug.fdaApproval || ''),
      genes: Array.isArray(drug.genes) ? drug.genes.map(formatGeneAssociation) : [],
      guidelines: Array.isArray(drug.guidelines) ? drug.guidelines.map(formatGuideline) : [],
      url: `https://www.pharmgkb.org/drug/${drug.id || ''}`,
    })).filter((d: PharmGKBDrug) => d.id && d.name)
  } catch (error) {
    console.error('PharmGKB drug search error:', error)
    return []
  }
}

/**
 * Search PharmGKB for gene information
 */
export async function searchPharmGKBGene(geneSymbol: string): Promise<PharmGKBGene[]> {
  try {
    const searchUrl = `${BASE_URL}/gene?symbol=${encodeURIComponent(geneSymbol)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const genes = searchData?.data || []

    return genes.map((gene: Record<string, unknown>) => ({
      id: String(gene.id || ''),
      symbol: String(gene.symbol || ''),
      name: String(gene.name || ''),
      chromosome: String(gene.chromosome || ''),
      variants: Array.isArray(gene.variants) ? gene.variants.map(formatVariant) : [],
      drugs: Array.isArray(gene.drugs) ? gene.drugs.map(formatDrugAssociation) : [],
      phenotypes: Array.isArray(gene.phenotypes) ? gene.phenotypes.map(String) : [],
      url: `https://www.pharmgkb.org/gene/${gene.id || ''}`,
    }))
  } catch (error) {
    console.error('PharmGKB gene search error:', error)
    return []
  }
}

/**
 * Get PharmGKB guidelines for a drug
 */
export async function getPharmGKBGuidelines(drugId: string): Promise<PharmGKBGuideline[]> {
  try {
    const guidelinesUrl = `${BASE_URL}/guideline?drugId=${drugId}`
    const guidelinesRes = await fetch(guidelinesUrl, fetchOptions)
    if (!guidelinesRes.ok) return []

    const guidelinesData = await guidelinesRes.json()
    const guidelines = guidelinesData?.data || []

    return guidelines.map((g: Record<string, unknown>) => ({
      id: String(g.id || ''),
      name: String(g.name || ''),
      source: String(g.source || ''),
      drugs: Array.isArray(g.drugs) ? g.drugs.map(String) : [],
      genes: Array.isArray(g.genes) ? g.genes.map(String) : [],
      recommendations: Array.isArray(g.recommendations) ? g.recommendations.map(formatRecommendation) : [],
    }))
  } catch (error) {
    console.error('PharmGKB guidelines fetch error:', error)
    return []
  }
}

/**
 * Get comprehensive pharmacogenomic data for a drug
 */
export async function getPharmGKBData(drugName: string): Promise<{
  drugs: PharmGKBDrug[]
  genes: PharmGKBGene[]
  guidelines: PharmGKBGuideline[]
}> {
  try {
    // First search for the drug
    const drugs = await searchPharmGKBDrug(drugName)

    if (drugs.length === 0) {
      return { drugs: [], genes: [], guidelines: [] }
    }

    // Get guidelines for the first drug found
    const primaryDrug = drugs[0]
    const guidelines = await getPharmGKBGuidelines(primaryDrug.id)

    // Get associated genes
    const geneSymbols = new Set<string>()
    primaryDrug.genes.forEach(g => geneSymbols.add(g.geneSymbol))
    guidelines.forEach(g => g.genes.forEach(gene => geneSymbols.add(gene)))

    const genes: PharmGKBGene[] = []
    for (const symbol of Array.from(geneSymbols).slice(0, 10)) {
      const geneResults = await searchPharmGKBGene(symbol)
      genes.push(...geneResults)
    }

    return { drugs, genes, guidelines }
  } catch (error) {
    console.error('PharmGKB data fetch error:', error)
    return { drugs: [], genes: [], guidelines: [] }
  }
}

function formatGeneAssociation(assoc: Record<string, unknown>): PharmGKBGeneAssociation {
  return {
    geneSymbol: String(assoc.geneSymbol || assoc.gene_symbol || ''),
    geneId: String(assoc.geneId || assoc.gene_id || ''),
    interactionType: String(assoc.interactionType || assoc.interaction_type || ''),
    level: String(assoc.level || 'Level 3'),
  }
}

function formatDrugAssociation(assoc: Record<string, unknown>): PharmGKBDrugAssociation {
  return {
    drugId: String(assoc.drugId || assoc.drug_id || ''),
    drugName: String(assoc.drugName || assoc.drug_name || ''),
    interactionType: String(assoc.interactionType || assoc.interaction_type || ''),
    level: parseLevel(assoc.level),
    phenotype: String(assoc.phenotype || ''),
    recommendation: String(assoc.recommendation || ''),
  }
}

function formatGuideline(g: Record<string, unknown>): PharmGKBGuideline {
  return {
    id: String(g.id || ''),
    name: String(g.name || ''),
    source: String(g.source || ''),
    drugs: Array.isArray(g.drugs) ? g.drugs.map(String) : [],
    genes: Array.isArray(g.genes) ? g.genes.map(String) : [],
    recommendations: Array.isArray(g.recommendations) ? g.recommendations.map(formatRecommendation) : [],
  }
}

function formatRecommendation(r: Record<string, unknown>): PharmGKBRecommendation {
  return {
    phenotype: String(r.phenotype || ''),
    implication: String(r.implication || ''),
    recommendation: String(r.recommendation || ''),
    classification: String(r.classification || ''),
  }
}

function formatVariant(v: Record<string, unknown>): PharmGKBVariant {
  return {
    id: String(v.id || ''),
    rsId: String(v.rsId || v.rs_id || ''),
    allele: String(v.allele || ''),
    gene: String(v.gene || ''),
    significance: String(v.significance || ''),
  }
}

function parseLevel(level: unknown): PharmGKBDrugAssociation['level'] {
  const l = String(level)
  if (l.includes('1A')) return 'Level 1A'
  if (l.includes('1B')) return 'Level 1B'
  if (l.includes('2A')) return 'Level 2A'
  if (l.includes('2B')) return 'Level 2B'
  if (l.includes('3')) return 'Level 3'
  return 'Level 4'
}