import type { DiseaseAssociation, DisGeNetAssociation, OrphanetDisease, CTDDiseaseAssociation, ChemblIndication } from './types'

export interface LandscapeDisease {
  name: string
  normalizedName: string
  status: 'approved' | 'investigational' | 'repurposing_candidate'
  phase?: number
  sources: string[]
  score: number
  therapeuticAreas: string[]
  geneSymbols: string[]
  diseaseId?: string
  orphaCode?: string
}

export interface TherapeuticLandscape {
  approved: LandscapeDisease[]
  investigational: LandscapeDisease[]
  repurposingCandidates: LandscapeDisease[]
  totalDiseases: number
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const DISEASE_SUFFIX_STOPS = new Set([
  'disease', 'syndrome', 'disorder', 'cancer', 'carcinoma',
  'type', 'stage', 'form', 'variant', 'subtypes',
])

function nameToContentTokens(name: string): string[] {
  return normalizeName(name)
    .split(' ')
    .filter(t => t.length > 2 && !DISEASE_SUFFIX_STOPS.has(t))
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return true
  if (na.length < 4 || nb.length < 4) return false
  if (na.includes(nb) || nb.includes(na)) return true
  const contentA = nameToContentTokens(a)
  const contentB = nameToContentTokens(b)
  if (contentA.length === 0 || contentB.length === 0) {
    const tokensA = na.split(' ').filter(t => t.length > 2)
    const tokensB = nb.split(' ').filter(t => t.length > 2)
    if (tokensA.length === 1 && tokensB.length === 1) return levenshteinClose(tokensA[0], tokensB[0])
    return false
  }
  if (contentA.length === 1 && contentB.length === 1) return levenshteinClose(contentA[0], contentB[0])
  let overlap = 0
  for (const t of contentA) {
    if (contentB.some(tb => tb === t || levenshteinClose(t, tb))) overlap++
  }
  return overlap >= Math.max(Math.min(contentA.length, contentB.length) - 1, 1)
}

function levenshteinClose(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false
  const maxDist = Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.25))
  let dist = 0
  let i = 0
  let j = 0
  while (i < a.length && j < b.length && dist <= maxDist) {
    if (a[i] === b[j]) { i++; j++ }
    else {
      dist++
      if (a.length > b.length) i++
      else if (a.length < b.length) j++
      else { i++; j++ }
    }
  }
  dist += (a.length - i) + (b.length - j)
  return dist <= maxDist
}

interface MergedDisease {
  normalizedName: string
  displayName: string
  sources: Set<string>
  maxScore: number
  therapeuticAreas: Set<string>
  geneSymbols: Set<string>
  diseaseId?: string
  orphaCode?: string
  maxPhase?: number
}

export function buildTherapeuticLandscape(
  chemblIndications: ChemblIndication[] | undefined | null,
  openTargetsDiseases: DiseaseAssociation[] | undefined | null,
  disgenetAssociations: DisGeNetAssociation[] | undefined | null,
  orphanetDiseases: OrphanetDisease[] | undefined | null,
  ctdDiseases: CTDDiseaseAssociation[] | undefined | null,
): TherapeuticLandscape {
  const merged = new Map<string, MergedDisease>()

  const indicationNames = new Set<string>()

  if (chemblIndications && chemblIndications.length > 0) {
    for (const ind of chemblIndications) {
      const display = ind.meshHeading || ind.efoTerm || ind.condition || ''
      if (!display) continue
      const norm = normalizeName(display)
      indicationNames.add(norm)

      const existing = findOrInsert(merged, display, norm)
      existing.sources.add('ChEMBL')
      existing.maxPhase = existing.maxPhase != null
        ? Math.max(existing.maxPhase, ind.maxPhaseForIndication)
        : ind.maxPhaseForIndication
    }
  }

  if (openTargetsDiseases && openTargetsDiseases.length > 0) {
    for (const d of openTargetsDiseases) {
      if (!d.diseaseName) continue
      const norm = normalizeName(d.diseaseName)
      const existing = findOrInsert(merged, d.diseaseName, norm)
      existing.sources.add('Open Targets')
      if (d.score > existing.maxScore) existing.maxScore = d.score
      for (const ta of d.therapeuticAreas ?? []) existing.therapeuticAreas.add(ta)
      if (d.diseaseId && !existing.diseaseId) existing.diseaseId = d.diseaseId
    }
  }

  if (disgenetAssociations && disgenetAssociations.length > 0) {
    for (const a of disgenetAssociations) {
      if (!a.diseaseName) continue
      const norm = normalizeName(a.diseaseName)
      const existing = findOrInsert(merged, a.diseaseName, norm)
      existing.sources.add('DisGeNET')
      if (a.score > existing.maxScore) existing.maxScore = a.score
      if (a.geneSymbol) existing.geneSymbols.add(a.geneSymbol)
      if (a.diseaseId && !existing.diseaseId) existing.diseaseId = a.diseaseId
    }
  }

  if (orphanetDiseases && orphanetDiseases.length > 0) {
    for (const d of orphanetDiseases) {
      if (!d.diseaseName) continue
      const norm = normalizeName(d.diseaseName)
      const existing = findOrInsert(merged, d.diseaseName, norm)
      existing.sources.add('Orphanet')
      if (d.orphaCode && !existing.orphaCode) existing.orphaCode = d.orphaCode
      for (const g of d.genes ?? []) existing.geneSymbols.add(g)
    }
  }

  if (ctdDiseases && ctdDiseases.length > 0) {
    for (const d of ctdDiseases) {
      if (!d.diseaseName) continue
      const norm = normalizeName(d.diseaseName)
      const existing = findOrInsert(merged, d.diseaseName, norm)
      existing.sources.add('CTD')
      if (d.inferenceScore > existing.maxScore) existing.maxScore = d.inferenceScore
      if (d.geneSymbol) existing.geneSymbols.add(d.geneSymbol)
    }
  }

  const approved: LandscapeDisease[] = []
  const investigational: LandscapeDisease[] = []
  const repurposingCandidates: LandscapeDisease[] = []

  for (const m of Array.from(merged.values())) {
    const isIndicated = indicationNames.has(m.normalizedName) ||
      Array.from(indicationNames).some(i => namesMatch(i, m.normalizedName))

    const disease: LandscapeDisease = {
      name: m.displayName,
      normalizedName: m.normalizedName,
      status: isIndicated
        ? (m.maxPhase != null && m.maxPhase >= 4 ? 'approved' : 'investigational')
        : 'repurposing_candidate',
      phase: m.maxPhase,
      sources: Array.from(m.sources).sort(),
      score: m.maxScore,
      therapeuticAreas: Array.from(m.therapeuticAreas).sort(),
      geneSymbols: Array.from(m.geneSymbols).sort(),
      diseaseId: m.diseaseId,
      orphaCode: m.orphaCode,
    }

    if (disease.status === 'approved') {
      approved.push(disease)
    } else if (disease.status === 'investigational') {
      investigational.push(disease)
    } else {
      repurposingCandidates.push(disease)
    }
  }

  approved.sort((a, b) => (b.phase ?? 0) - (a.phase ?? 0) || b.score - a.score)
  investigational.sort((a, b) => (b.phase ?? 0) - (a.phase ?? 0) || b.score - a.score)
  repurposingCandidates.sort((a, b) => b.score - a.score)

  return {
    approved,
    investigational,
    repurposingCandidates,
    totalDiseases: approved.length + investigational.length + repurposingCandidates.length,
  }
}

function findOrInsert(
  map: Map<string, MergedDisease>,
  displayName: string,
  normalizedName: string,
): MergedDisease {
  for (const [key, existing] of Array.from(map.entries())) {
    if (namesMatch(key, normalizedName)) {
      if (normalizedName.length < existing.normalizedName.length || existing.normalizedName === key) {
        if (displayName.length < existing.displayName.length || existing.displayName === key) {
        } else {
          existing.displayName = displayName
        }
        existing.normalizedName = normalizedName.length < existing.normalizedName.length
          ? normalizedName
          : existing.normalizedName
      }
      return existing
    }
  }

  const entry: MergedDisease = {
    normalizedName,
    displayName,
    sources: new Set(),
    maxScore: 0,
    therapeuticAreas: new Set(),
    geneSymbols: new Set(),
  }
  map.set(normalizedName, entry)
  return entry
}