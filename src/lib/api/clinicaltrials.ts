import type { ClinicalTrial } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function parseStudies(studies: unknown[]): ClinicalTrial[] {
  return (studies as Record<string, unknown>[]).map((s) => {
    const p = (s.protocolSection ?? {}) as Record<string, unknown>
    const id = (p.identificationModule ?? {}) as Record<string, unknown>
    const status = (p.statusModule ?? {}) as Record<string, unknown>
    const design = (p.designModule ?? {}) as Record<string, unknown>
    const sponsor = (p.sponsorCollaboratorsModule ?? {}) as Record<string, unknown>
    const conditions = (p.conditionsModule ?? {}) as Record<string, unknown>
    const arms = (p.armsInterventionsModule ?? {}) as Record<string, unknown>
    const enrollment = (design.enrollmentInfo ?? {}) as Record<string, unknown>
    const interventions = (arms.interventions ?? []) as { type: string; name: string }[]

    return {
      nctId: String(id.nctId ?? ''),
      title: String(id.briefTitle ?? ''),
      phase: Array.isArray(design.phases) ? (design.phases as string[]).join('/') : 'N/A',
      status: String(status.overallStatus ?? ''),
      sponsor: String((sponsor.leadSponsor as Record<string, unknown> | undefined)?.name ?? 'Unknown'),
      startDate: String((status.startDateStruct as Record<string, unknown> | undefined)?.date ?? ''),
      completionDate: String((status.completionDateStruct as Record<string, unknown> | undefined)?.date ?? ''),
      conditions: Array.isArray(conditions.conditions) ? (conditions.conditions as string[]) : [],
      interventions: interventions.map(i => i.name).filter(Boolean),
      enrollment: typeof enrollment.count === 'number' ? enrollment.count : undefined,
      interventionDetails: interventions.map(i => ({ name: i.name, type: i.type })).filter(i => i.name),
    }
  })
}

export async function getClinicalTrialsByName(name: string, limit: number = LIMITS.CLINICAL_TRIALS.initial): Promise<ClinicalTrial[]> {
  try {
    const url = `${BASE_URL}?query.term=${encodeURIComponent(name)}&pageSize=${limit}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return parseStudies(data.studies ?? [])
  } catch {
    return []
  }
}

export async function searchClinicalTrialsByCondition(condition: string, pageSize: number = 50): Promise<ClinicalTrial[]> {
  try {
    const url = `${BASE_URL}?query.cond=${encodeURIComponent(condition)}&pageSize=${pageSize}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return parseStudies(data.studies ?? [])
  } catch {
    return []
  }
}

export function sortTrials(trials: ClinicalTrial[]): ClinicalTrial[] {
  const phaseRank: Record<string, number> = {
    'Phase 4': 5, 'Phase 3': 4, 'Phase 2': 3, 'Phase 1': 2,
    'Phase 3/Phase 4': 4.5, 'Phase 2/Phase 3': 3.5, 'Phase 1/Phase 2': 2.5,
  }
  const statusRank: Record<string, number> = {
    'RECRUITING': 3, 'NOT_YET_RECRUITING': 2, 'ACTIVE_NOT_RECRUITING': 1,
  }
  return [...trials].sort((a, b) => {
    const aPhase = phaseRank[a.phase] ?? (a.phase === 'N/A' ? 0 : 1)
    const bPhase = phaseRank[b.phase] ?? (b.phase === 'N/A' ? 0 : 1)
    if (aPhase !== bPhase) return bPhase - aPhase
    const aStatus = statusRank[a.status] ?? 0
    const bStatus = statusRank[b.status] ?? 0
    return bStatus - aStatus
  })
}

export function extractDrugInterventions(trials: ClinicalTrial[]): { name: string; type: string; trialCount: number }[] {
  const drugTypes = new Set(['DRUG', 'BIOLOGICAL', 'COMBINATION_PRODUCT'])
  const counts = new Map<string, { name: string; type: string; trialCount: number }>()
  for (const t of trials) {
    if (!t.interventionDetails) continue
    for (const i of t.interventionDetails) {
      if (!drugTypes.has(i.type)) continue
      const key = i.name.toUpperCase()
      const existing = counts.get(key)
      if (existing) {
        existing.trialCount++
      } else {
        counts.set(key, { name: i.name, type: i.type, trialCount: 1 })
      }
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.trialCount - a.trialCount)
}