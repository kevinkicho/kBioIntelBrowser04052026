import { searchDiseases, resolveMoleculesFromNames } from './diseaseSearch'
import { getTargetsForDisease } from './api/opentargets'
import { getGenesByDisease } from './api/disgenet'
import { getTargetRelatedMolecules, type TargetRelatedMolecule } from './api/dgidb'
import { searchClinicalTrialsByCondition, extractDrugInterventions } from './api/clinicaltrials'
import { getChemblIndicationsByName } from './api/chembl-indications'

export type ConfidenceLevel = 'high' | 'moderate' | 'preliminary'

export interface CandidateMolecule {
  name: string
  cid: number | null

  clinicalPhase: number
  geneAssociationScore: number
  sharedTargetRatio: number
  trialCountNorm: number

  clinicalPhaseRaw: number
  sharedTargetCountRaw: number
  trialCountRaw: number
  geneScoreRaw: number
  sources: string[]
  confidence: ConfidenceLevel

  compositeScore: number
}

export interface DiseaseGene {
  symbol: string
  score: number
  source: string
}

export interface RankResult {
  query: string
  diseaseId: string | null
  diseaseName: string
  therapeuticAreas: string[]
  genes: DiseaseGene[]
  candidates: CandidateMolecule[]
}

const W_CLINICAL_PHASE = 0.35
const W_GENE_ASSOCIATION = 0.25
const W_SHARED_TARGET = 0.20
const W_TRIAL_COUNT = 0.20

function normalizeLog(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.min(1, Math.log2(1 + value) / Math.log2(1 + maxValue))
}

function matchIndication(diseaseQuery: string, indications: { meshHeading: string; efoTerm: string; maxPhaseForIndication: number }[]): number {
  const q = diseaseQuery.toLowerCase()
  const terms = q.split(/[\s,]+/).filter(t => t.length > 2)
  let bestPhase = 0
  for (const ind of indications) {
    const heading = (ind.meshHeading || '').toLowerCase()
    const efo = (ind.efoTerm || '').toLowerCase()
    const matchCount = terms.filter(t => heading.includes(t) || efo.includes(t)).length
    if (matchCount >= Math.ceil(terms.length * 0.5)) {
      const phase = ind.maxPhaseForIndication ?? 0
      if (phase > bestPhase) bestPhase = phase
    }
  }
  return bestPhase
}

export async function rankCandidatesForDisease(query: string, limit: number = 15): Promise<RankResult> {
  const diseaseResults = await searchDiseases(query, 5)
  if (diseaseResults.length === 0) {
    return {
      query,
      diseaseId: null,
      diseaseName: query,
      therapeuticAreas: [],
      genes: [],
      candidates: [],
    }
  }

  const primaryDisease = diseaseResults[0]
  const diseaseId = primaryDisease.id ?? null
  const diseaseName = primaryDisease.name
  const therapeuticAreas = primaryDisease.therapeuticAreas ?? []

  const [diseaseGenes, targetMolecules, trialDrugs] = await Promise.allSettled([
    gatherDiseaseGenes(diseaseId, diseaseName),
    gatherTargetMolecules(diseaseId, diseaseName),
    gatherTrialDrugs(diseaseName),
  ])

  const genes: DiseaseGene[] = diseaseGenes.status === 'fulfilled' ? diseaseGenes.value : []
  const moleculesFromTargets: TargetRelatedMolecule[] = targetMolecules.status === 'fulfilled' ? targetMolecules.value : []
  const moleculesFromTrials: Map<string, number> = trialDrugs.status === 'fulfilled' ? trialDrugs.value : new Map()
  const moleculeNamesFromDisease: string[] = primaryDisease.molecules?.map(m => m.name) ?? []

  const allMoleculeNames = new Set<string>()
  for (const m of moleculesFromTargets) allMoleculeNames.add(m.name)
  moleculesFromTrials.forEach((_, name) => allMoleculeNames.add(name))
  for (const name of moleculeNamesFromDisease) allMoleculeNames.add(name)

  const geneSymbolSet = new Map(genes.map(g => [g.symbol.toUpperCase(), g.score]))
  const topTargetCount = Math.max(genes.length, 1)
  const maxTrialCount = Math.max(...Array.from(moleculesFromTrials.values()), 1)

  const candidates: CandidateMolecule[] = []

  const moleculeArray = Array.from(allMoleculeNames).slice(0, 50)

  const cidResults = await resolveMoleculesFromNames(moleculeArray)
  const cidMap = new Map<string, number | null>()
  for (const r of cidResults) cidMap.set(r.name.toLowerCase(), r.cid)

  const indicationPromises = moleculeArray.slice(0, 20).map(async (name) => {
    try {
      const indications = await getChemblIndicationsByName(name)
      return { name, indications }
    } catch {
      return { name, indications: [] as { meshHeading: string; efoTerm: string; maxPhaseForIndication: number }[] }
    }
  })
  const indicationResults = await Promise.allSettled(indicationPromises)
  const indicationMap = new Map<string, { meshHeading: string; efoTerm: string; maxPhaseForIndication: number }[]>()
  for (const r of indicationResults) {
    if (r.status === 'fulfilled' && r.value.indications) {
      const mapped = r.value.indications.map((ind: { meshHeading?: string; efoTerm?: string; maxPhaseForIndication?: number }) => ({
        meshHeading: ind.meshHeading ?? '',
        efoTerm: ind.efoTerm ?? '',
        maxPhaseForIndication: ind.maxPhaseForIndication ?? 0,
      }))
      indicationMap.set(r.value.name, mapped)
    }
  }

  for (const name of moleculeArray) {
    const lowerName = name.toLowerCase()
    const cid = cidMap.get(lowerName) ?? null

    const targetMol = moleculesFromTargets.find(m => m.name.toLowerCase() === lowerName)
    const trialCount = moleculesFromTrials.get(name) ?? moleculesFromTrials.get(lowerName) ?? 0

    const geneAssociationScore = targetMol
      ? computeGeneScore(targetMol, genes)
      : 0

    const sharedTargetCount = targetMol
      ? targetMol.sharedTargets.filter(t => geneSymbolSet.has(t.toUpperCase())).length
      : 0
    const sharedTargetRatio = Math.min(1, sharedTargetCount / Math.min(topTargetCount, 10))

    const trialCountNorm = normalizeLog(trialCount, maxTrialCount)

    const indications = indicationMap.get(name) ?? []
    const clinicalPhase = matchIndication(diseaseName, indications)
    const clinicalPhaseNorm = clinicalPhase / 4

    const compositeScore =
      W_CLINICAL_PHASE * clinicalPhaseNorm +
      W_GENE_ASSOCIATION * geneAssociationScore +
      W_SHARED_TARGET * sharedTargetRatio +
      W_TRIAL_COUNT * trialCountNorm

    const sources: string[] = []
    if (targetMol) sources.push('DGIdb')
    if (trialCount > 0) sources.push('ClinicalTrials')
    if (moleculeNamesFromDisease.some(n => n.toLowerCase() === lowerName)) sources.push(primaryDisease.source)
    if (indications.length > 0) sources.push('ChEMBL')

    const uniqueSources = Array.from(new Set(sources))
    const confidence: ConfidenceLevel = uniqueSources.length >= 4 ? 'high' : uniqueSources.length >= 2 ? 'moderate' : 'preliminary'

    candidates.push({
      name,
      cid,

      clinicalPhase: clinicalPhaseNorm,
      geneAssociationScore,
      sharedTargetRatio,
      trialCountNorm,

      clinicalPhaseRaw: clinicalPhase,
      sharedTargetCountRaw: sharedTargetCount,
      trialCountRaw: trialCount,
      geneScoreRaw: geneAssociationScore,
      sources: uniqueSources,
      confidence,

      compositeScore,
    })
  }

  candidates.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore
    if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length
    return a.name.localeCompare(b.name)
  })

  return {
    query,
    diseaseId,
    diseaseName,
    therapeuticAreas,
    genes,
    candidates: candidates.slice(0, limit),
  }
}

function computeGeneScore(mol: TargetRelatedMolecule, genes: DiseaseGene[]): number {
  const geneMap = new Map(genes.map(g => [g.symbol.toUpperCase(), g.score]))
  const scores: number[] = []
  for (const target of mol.sharedTargets) {
    const score = geneMap.get(target.toUpperCase())
    if (score !== undefined) scores.push(score)
  }
  if (scores.length === 0) return 0
  return Math.max(...scores)
}

async function gatherDiseaseGenes(diseaseId: string | null, diseaseName: string): Promise<DiseaseGene[]> {
  const geneMap = new Map<string, DiseaseGene>()

  const [otTargets, disgenetGenes] = await Promise.allSettled([
    diseaseId ? getTargetsForDisease(diseaseId) : Promise.resolve([]),
    getGenesByDisease(diseaseName),
  ])

  if (otTargets.status === 'fulfilled') {
    for (const t of otTargets.value) {
      const symbol = t.name.split(' ')[0].toUpperCase()
      if (!geneMap.has(symbol) || (geneMap.get(symbol)!.score < t.overallScore)) {
        geneMap.set(symbol, { symbol, score: t.overallScore, source: 'Open Targets' })
      }
    }
  }

  if (disgenetGenes.status === 'fulfilled') {
    for (const g of disgenetGenes.value) {
      const symbol = g.geneSymbol.toUpperCase()
      if (!geneMap.has(symbol) || (geneMap.get(symbol)!.score < g.score)) {
        geneMap.set(symbol, { symbol, score: g.score, source: `DisGeNET (${g.source})` })
      }
    }
  }

  return Array.from(geneMap.values()).sort((a, b) => b.score - a.score)
}

async function gatherTargetMolecules(diseaseId: string | null, diseaseName: string): Promise<TargetRelatedMolecule[]> {
  const genes: string[] = []

  if (diseaseId) {
    try {
      const targets = await getTargetsForDisease(diseaseId)
      for (const t of targets.slice(0, 8)) {
        genes.push(t.name.split(' ')[0])
      }
    } catch {}
  }

  try {
    const disgenetResults = await getGenesByDisease(diseaseName)
    for (const g of disgenetResults.slice(0, 8)) {
      if (!genes.includes(g.geneSymbol)) genes.push(g.geneSymbol)
    }
  } catch {}

  if (genes.length === 0) return []

  try {
    return await getTargetRelatedMolecules(genes.slice(0, 8), '')
  } catch {
    return []
  }
}

async function gatherTrialDrugs(diseaseName: string): Promise<Map<string, number>> {
  try {
    const trials = await searchClinicalTrialsByCondition(diseaseName, 50)
    const drugInterventions = extractDrugInterventions(trials)
    const drugCounts = new Map<string, number>()
    for (const d of drugInterventions) {
      drugCounts.set(d.name, d.trialCount)
    }
    return drugCounts
  } catch {
    return new Map()
  }
}

export { normalizeLog, matchIndication }