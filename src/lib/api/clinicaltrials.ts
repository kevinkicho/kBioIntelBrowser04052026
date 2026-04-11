import type { ClinicalTrial } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

export async function getClinicalTrialsByName(name: string, limit: number = LIMITS.CLINICAL_TRIALS.initial): Promise<ClinicalTrial[]> {
  try {
    const url = `${BASE_URL}?query.term=${encodeURIComponent(name)}&pageSize=${limit}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.studies ?? []).map((s: {
      protocolSection: {
        identificationModule: { nctId: string; briefTitle: string }
        statusModule: { overallStatus: string; startDateStruct?: { date: string } }
        designModule?: { phases?: string[] }
        sponsorCollaboratorsModule?: { leadSponsor?: { name: string } }
        conditionsModule?: { conditions?: string[] }
      }
    }) => {
      const id = s.protocolSection
      return {
        nctId: id.identificationModule.nctId ?? '',
        title: id.identificationModule.briefTitle ?? '',
        phase: id.designModule?.phases?.[0] ?? 'N/A',
        status: id.statusModule.overallStatus ?? '',
        sponsor: id.sponsorCollaboratorsModule?.leadSponsor?.name ?? 'Unknown',
        startDate: id.statusModule.startDateStruct?.date ?? '',
        conditions: id.conditionsModule?.conditions ?? [],
      }
    })
  } catch {
    return []
  }
}
