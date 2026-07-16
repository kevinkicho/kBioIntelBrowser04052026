import type { DiseaseAssociation } from '../types'
import { getChemblIdByName } from './chembl'

function escapeGraphQLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

const API_URL = 'https://api.platform.opentargets.org/api/v4/graphql'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search for disease associations by molecule name using OpenTargets Platform
 * Falls back gracefully if the API is unavailable
 */
export async function getDiseaseAssociationsByName(name: string): Promise<DiseaseAssociation[]> {
  try {
    // Try to get ChEMBL ID for more precise search
    const chemblId = await getChemblIdByName(name)
    
    if (chemblId) {
      // Try drug-specific query first
      const drugResults = await queryDrugDiseases(chemblId)
      if (drugResults.length > 0) return drugResults
    }
    
    // Fallback to disease search
    return await searchDiseases(name)
  } catch (error) {
    console.error('OpenTargets query error:', error)
    return []
  }
}

async function queryDrugDiseases(chemblId: string): Promise<DiseaseAssociation[]> {
  const query = `
    query {
      drug(chemblId: "${escapeGraphQLString(chemblId)}") {
        name
        linkedDiseases {
          count
          rows {
            disease {
              id
              name
              therapeuticAreas {
                id
                name
              }
            }
          }
        }
      }
    }
  `

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    ...fetchOptions,
  })

  if (!res.ok) return []
  
  const data = await res.json()
  
  if (data.errors) {
    console.error('OpenTargets GraphQL errors:', data.errors)
    return []
  }

  const rows = data.data?.drug?.linkedDiseases?.rows ?? []
  return rows.map((row: {
    disease: {
      id: string
      name: string
      therapeuticAreas?: { id: string; name: string }[]
    }
  }) => ({
    diseaseId: row.disease.id ?? '',
    diseaseName: row.disease.name ?? '',
    therapeuticAreas: (row.disease.therapeuticAreas ?? []).map(ta => ta.name),
  }))
}

export async function searchDiseases(queryString: string): Promise<DiseaseAssociation[]> {
  const query = `
    query {
      search(
        queryString: "${escapeGraphQLString(queryString)}"
        entityNames: ["disease"]
        page: { index: 0, size: 10 }
      ) {
        total
        results {
          ... on Disease {
            id
            name
            description
            therapeuticAreas {
              id
              name
            }
          }
        }
      }
    }
  `

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    ...fetchOptions,
  })

  if (!res.ok) return []
  
  const data = await res.json()
  
  if (data.errors) {
    console.error('OpenTargets GraphQL errors:', data.errors)
    return []
  }

  const results = data.data?.search?.results ?? []
  return results.map((result: {
    id: string
    name: string
    description?: string
    therapeuticAreas?: { id: string; name: string }[]
  }) => ({
    diseaseId: result.id ?? '',
    diseaseName: result.name ?? '',
    description: result.description ?? undefined,
    therapeuticAreas: (result.therapeuticAreas ?? []).map(ta => ta.name),
  }))
}

/**
 * Known drug / clinical candidate for a disease from Open Targets.
 * Platform API 26.x exposes this as `drugAndClinicalCandidates` (successor to
 * the historical `knownDrugs` field on Disease).
 */
export interface KnownDrugForDisease {
  name: string
  chemblId: string | null
  /** Raw OT clinical-stage label (e.g. APPROVAL, PHASE_3, UNKNOWN). */
  maxClinicalStage: string | null
  /** Best-effort numeric phase 0–4 for scoring / UI. */
  maxPhase: number
}

/** Map Open Targets clinical-stage strings → numeric phase 0–4. */
export function clinicalStageToPhase(stage: string | null | undefined): number {
  if (!stage) return 0
  const s = stage.toUpperCase().replace(/[\s-]+/g, '_')
  if (s === 'APPROVAL' || s === 'APPROVED' || s === 'PHASE_4' || s === 'PHASE_IV' || s.includes('APPROV')) {
    return 4
  }
  if (s === 'PHASE_3' || s === 'PHASE_III' || s === 'PHASE_2_3' || s === 'PHASE_III_IV') return 3
  if (s === 'PHASE_2' || s === 'PHASE_II' || s === 'PHASE_1_2' || s === 'PHASE_II_III') return 2
  if (s === 'PHASE_1' || s === 'PHASE_I' || s === 'PHASE_0_1') return 1
  return 0
}

/**
 * Real known drugs / clinical candidates for a disease (Open Targets GraphQL).
 * Uses `drugAndClinicalCandidates` — the live replacement for `knownDrugs`.
 * Never returns target/protein names (PR3a decontamination fix completed in PR3b).
 */
export async function getKnownDrugsForDisease(
  diseaseId: string,
  limit: number = 50,
): Promise<KnownDrugForDisease[]> {
  if (!diseaseId?.trim()) return []
  try {
    // OT Platform 26.x: Disease.knownDrugs was renamed to drugAndClinicalCandidates.
    const query = `
      query {
        disease(efoId: "${escapeGraphQLString(diseaseId)}") {
          id
          name
          drugAndClinicalCandidates {
            count
            rows {
              maxClinicalStage
              drug {
                id
                name
                maximumClinicalStage
              }
            }
          }
        }
      }
    `
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.errors) {
      console.error('OpenTargets knownDrugs GraphQL errors:', data.errors)
      return []
    }

    const rows: Array<{
      maxClinicalStage?: string | null
      drug?: { id?: string; name?: string; maximumClinicalStage?: string | null } | null
    }> = data.data?.disease?.drugAndClinicalCandidates?.rows ?? []

    // Dedupe by drug name (case-insensitive), keep highest phase
    const byName = new Map<string, KnownDrugForDisease>()
    for (const row of rows) {
      const name = row.drug?.name?.trim()
      if (!name) continue
      const stage = row.maxClinicalStage ?? row.drug?.maximumClinicalStage ?? null
      const entry: KnownDrugForDisease = {
        name,
        chemblId: row.drug?.id ?? null,
        maxClinicalStage: stage,
        maxPhase: clinicalStageToPhase(stage),
      }
      const key = name.toLowerCase()
      const existing = byName.get(key)
      if (!existing || existing.maxPhase < entry.maxPhase) {
        byName.set(key, entry)
      }
    }

    return Array.from(byName.values())
      .sort((a, b) => b.maxPhase - a.maxPhase || a.name.localeCompare(b.name))
      .slice(0, Math.max(1, limit))
  } catch (error) {
    console.error('OpenTargets getKnownDrugsForDisease error:', error)
    return []
  }
}

/**
 * Drug **names** for a disease (known drugs / clinical candidates).
 * Prefer {@link getKnownDrugsForDisease} when phase / ChEMBL id are needed.
 */
export async function getDrugsForDisease(diseaseId: string): Promise<string[]> {
  const drugs = await getKnownDrugsForDisease(diseaseId, 50)
  return drugs.map((d) => d.name).filter(Boolean)
}

export async function getTargetsForDisease(diseaseId: string): Promise<{ id: string; name: string; overallScore: number }[]> {
  try {
    const query = `
      query {
        disease(efoId: "${escapeGraphQLString(diseaseId)}") {
          linkedTargets {
            rows {
              id
              target { id name }
              score
            }
          }
        }
      }
    `
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.errors) return []
    const rows: { id: string; target: { id: string; name: string }; score: number }[] = data.data?.disease?.linkedTargets?.rows ?? []
    return rows.map(r => ({
      id: r.target?.id ?? r.id ?? '',
      name: r.target?.name ?? '',
      overallScore: r.score ?? 0,
    })).filter(t => t.name).slice(0, 30)
  } catch {
    return []
  }
}
