import type { CTDInteraction, CTDDiseaseAssociation } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://ctdbase.org'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

/**
 * CTD harvest leaf (DGIdb / Open Targets fallbacks).
 * HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404, and zero-hit JSON remain empty.
 * CTD report 404s are treated as absent (legacy URLs are often dead).
 * DGIdb and Open Targets are cross-source fallbacks. All-fail throws.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown }

function mapInteractionRows(rows: string[][], chemicalName: string): CTDInteraction[] {
  return rows.slice(0, 30).map((row) => ({
    chemicalName: row[0] ?? chemicalName,
    chemicalId: row[1] ?? '',
    geneSymbol: row[2] ?? '',
    geneId: row[3] ?? '',
    interaction: row[4] ?? '',
    interactionActions: (row[5] ?? '').split('|'),
    pmids: (row[6] ?? '').split('|').slice(0, 5),
    source: 'CTD',
  }))
}

function mapDiseaseRows(
  rows: string[][],
  extras: { geneSymbol?: string; chemicalName?: string },
): CTDDiseaseAssociation[] {
  return rows.slice(0, 30).map((row) => ({
    diseaseName: row[0] ?? '',
    diseaseId: row[1] ?? '',
    geneSymbol: extras.geneSymbol ?? '',
    geneId: row[2] ?? '',
    chemicalName: extras.chemicalName,
    chemicalId: extras.chemicalName ? (row[2] ?? '') : undefined,
    inferenceScore: parseFloat(row[3] ?? '0'),
    pmids: (row[4] ?? '').split('|').slice(0, 5),
    source: 'CTD',
  }))
}

async function fetchCtdReport(url: string): Promise<string[][]> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'CTD')
  const data = await res.json()
  const rows = data.data ?? []
  return Array.isArray(rows) ? rows : []
}

/**
 * Search CTD for chemical-gene interactions (legacy report URLs often 404).
 */
export async function getChemicalGeneInteractions(chemicalName: string): Promise<CTDInteraction[]> {
  const candidates = [
    `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_gene_interaction.json`,
    `http://ctdbase.org/reports/chemical_${encodeURIComponent(chemicalName)}_gene_interaction.json`,
  ]
  let lastError: unknown = null
  let sawAbsent = false
  for (const url of candidates) {
    try {
      const rows = await fetchCtdReport(url)
      if (rows.length === 0) {
        sawAbsent = true
        continue
      }
      return mapInteractionRows(rows, chemicalName)
    } catch (error) {
      lastError = error
    }
  }
  if (lastError && !sawAbsent) {
    throw lastError instanceof Error ? lastError : new Error('CTD upstream failed')
  }
  return []
}

export async function getGeneDiseaseAssociations(geneSymbol: string): Promise<CTDDiseaseAssociation[]> {
  const url = `${BASE_URL}/reports/gene_${encodeURIComponent(geneSymbol)}_disease.json`
  const rows = await fetchCtdReport(url)
  return mapDiseaseRows(rows, { geneSymbol })
}

export async function getChemicalDiseaseAssociations(chemicalName: string): Promise<CTDDiseaseAssociation[]> {
  const url = `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_disease.json`
  const rows = await fetchCtdReport(url)
  return mapDiseaseRows(rows, { chemicalName })
}

/**
 * Free fallbacks when CTD report endpoints 404:
 * - DGIdb chemical–gene
 * - Open Targets disease associations
 * All-fail throws so HTTP is not painted EMPTY.
 */
async function freeFallbacks(name: string): Promise<{
  interactions: CTDInteraction[]
  diseaseAssociations: CTDDiseaseAssociation[]
}> {
  const dgidbOutcome: Outcome<CTDInteraction[]> = await import('./dgidb')
    .then(({ getDrugGeneInteractionsByName }) => getDrugGeneInteractionsByName(name))
    .then((ix): Outcome<CTDInteraction[]> => ({
      ok: true,
      value: ix.slice(0, 25).map((i) => ({
        chemicalName: name,
        chemicalId: '',
        geneSymbol: i.geneSymbol || i.geneName || '',
        geneId: '',
        interaction: i.interactionType || 'interacts_with',
        interactionActions: (i.interactionType || '').split(',').map((s) => s.trim()).filter(Boolean),
        pmids: [],
        source: 'DGIdb (CTD fallback)',
      })),
    }))
    .catch((error): Outcome<CTDInteraction[]> => ({ ok: false, error }))

  const otOutcome: Outcome<CTDDiseaseAssociation[]> = await import('./opentargets')
    .then(({ getDiseaseAssociationsByName }) => getDiseaseAssociationsByName(name))
    .then((hits): Outcome<CTDDiseaseAssociation[]> => ({
      ok: true,
      value: hits.slice(0, 20).map((h) => ({
        diseaseName: h.diseaseName ?? '',
        diseaseId: h.diseaseId ?? '',
        geneSymbol: '',
        geneId: '',
        chemicalName: name,
        chemicalId: '',
        inferenceScore: Number(h.score) || 0,
        pmids: [],
        source: 'Open Targets (CTD fallback)',
      })),
    }))
    .catch((error): Outcome<CTDDiseaseAssociation[]> => ({ ok: false, error }))

  const interactions = dgidbOutcome.ok ? dgidbOutcome.value : []
  const diseaseAssociations = otOutcome.ok ? otOutcome.value : []
  if (interactions.length > 0 || diseaseAssociations.length > 0) {
    return { interactions, diseaseAssociations }
  }
  if (!dgidbOutcome.ok && !otOutcome.ok) {
    const err = otOutcome.error ?? dgidbOutcome.error
    throw err instanceof Error ? err : new Error('CTD fallbacks failed')
  }
  return { interactions, diseaseAssociations }
}

export async function getCTDData(name: string, isGene: boolean = false): Promise<{
  interactions: CTDInteraction[]
  diseaseAssociations: CTDDiseaseAssociation[]
}> {
  const q = name?.trim()
  if (!q) return { interactions: [], diseaseAssociations: [] }

  let primary: { interactions: CTDInteraction[]; diseaseAssociations: CTDDiseaseAssociation[] } = {
    interactions: [],
    diseaseAssociations: [],
  }
  try {
    const [interactions, diseaseAssociations] = await Promise.all([
      isGene ? Promise.resolve([]) : getChemicalGeneInteractions(q),
      isGene ? getGeneDiseaseAssociations(q) : getChemicalDiseaseAssociations(q),
    ])
    primary = { interactions, diseaseAssociations }
  } catch {
    // Primary 5xx/HTML/network — still try cross-source fallbacks.
  }

  if (primary.interactions.length > 0 || primary.diseaseAssociations.length > 0) {
    return primary
  }

  return freeFallbacks(q)
}
