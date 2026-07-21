import type { DiseaseAssociation } from '../types'
import { getChemblIdByName } from './chembl'

function escapeGraphQLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

const API_URL = 'https://api.platform.opentargets.org/api/v4/graphql'
// no-store: avoid sticky empty caches when GraphQL schema/upstream blips on App Hosting
const fetchOptions: RequestInit = {
  cache: 'no-store',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
}

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
  // Open Targets Platform API 26+: SearchResult uses `hits`, not legacy `results`.
  // Using `results` returns GraphQL errors and empty disease search (homepage default mode).
  const query = `
    query DiseaseSearch($q: String!) {
      search(
        queryString: $q
        entityNames: ["disease"]
        page: { index: 0, size: 10 }
      ) {
        total
        hits {
          id
          name
          entity
          description
        }
      }
    }
  `

  const res = await fetch(API_URL, {
    method: 'POST',
    ...fetchOptions,
    headers: { ...((fetchOptions.headers as Record<string, string>) || {}), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { q: queryString },
    }),
  })

  if (!res.ok) {
    console.error('[opentargets] searchDiseases HTTP', res.status)
    return []
  }

  const data = await res.json()

  if (data.errors) {
    console.error('OpenTargets GraphQL errors:', data.errors)
    return []
  }

  const hits = (data.data?.search?.hits ?? []) as Array<{
    id?: string
    name?: string
    entity?: string
    description?: string
  }>

  return hits
    .filter((h) => (h.entity || 'disease').toLowerCase() === 'disease' && h.name)
    .map((h) => ({
      diseaseId: h.id ?? '',
      diseaseName: h.name ?? '',
      description: h.description ?? undefined,
      score: 0,
      evidenceCount: 0,
      sources: ['Open Targets'],
      therapeuticAreas: [] as string[],
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

/**
 * Resolve a hard disease registry id (EFO_*, MONDO_*, …) via Open Targets.
 * Used when name search hits don't include the pinned id (id namespace drift).
 */
export async function getDiseaseById(
  diseaseId: string,
): Promise<{ id: string; name: string; description?: string; therapeuticAreas: string[] } | null> {
  const id = diseaseId?.trim()
  if (!id) return null
  try {
    const query = `
      query DiseaseById($efoId: String!) {
        disease(efoId: $efoId) {
          id
          name
          description
          therapeuticAreas {
            name
          }
        }
      }
    `
    const res = await fetch(API_URL, {
      method: 'POST',
      ...fetchOptions,
      headers: {
        ...((fetchOptions.headers as Record<string, string>) || {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { efoId: id },
      }),
    })
    if (!res.ok) {
      console.error('[opentargets] getDiseaseById HTTP', res.status)
      return null
    }
    const data = await res.json()
    if (data.errors) {
      console.error('[opentargets] getDiseaseById GraphQL errors:', data.errors)
      return null
    }
    const d = data.data?.disease as
      | {
          id?: string
          name?: string
          description?: string
          therapeuticAreas?: { name?: string }[]
        }
      | null
      | undefined
    if (!d?.id || !d?.name) return null
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      therapeuticAreas: (d.therapeuticAreas ?? [])
        .map((t) => t.name)
        .filter((n): n is string => Boolean(n)),
    }
  } catch (err) {
    console.error('[opentargets] getDiseaseById', err)
    return null
  }
}

/**
 * Disease → associated gene targets (Open Targets Platform GraphQL).
 * Platform 26.x: `associatedTargets` (not legacy `linkedTargets`).
 * Symbol field is `approvedSymbol` (not target.name).
 */
export async function getTargetsForDisease(diseaseId: string): Promise<{ id: string; name: string; overallScore: number }[]> {
  const id = diseaseId?.trim()
  if (!id) return []
  try {
    const query = `
      query DiseaseTargets($efoId: String!) {
        disease(efoId: $efoId) {
          id
          name
          associatedTargets(page: { index: 0, size: 40 }) {
            count
            rows {
              score
              target {
                id
                approvedSymbol
              }
            }
          }
        }
      }
    `
    const res = await fetch(API_URL, {
      method: 'POST',
      ...fetchOptions,
      headers: {
        ...((fetchOptions.headers as Record<string, string>) || {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { efoId: id },
      }),
    })
    if (!res.ok) {
      console.error('[opentargets] getTargetsForDisease HTTP', res.status)
      return []
    }
    const data = await res.json()
    if (data.errors) {
      console.error('[opentargets] getTargetsForDisease GraphQL errors:', data.errors)
      return []
    }
    const rows = (data.data?.disease?.associatedTargets?.rows ?? []) as Array<{
      score?: number
      target?: { id?: string; approvedSymbol?: string }
    }>
    return rows
      .map((r) => ({
        id: r.target?.id ?? '',
        name: (r.target?.approvedSymbol ?? '').trim(),
        overallScore: typeof r.score === 'number' ? r.score : 0,
      }))
      .filter((t) => t.name)
      .slice(0, 30)
  } catch (err) {
    console.error('[opentargets] getTargetsForDisease', err)
    return []
  }
}
