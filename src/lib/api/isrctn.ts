import type { ISRCTNTrial } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * ISRCTN harvest leaf (via ClinicalTrials.gov). HTTP / HTML / timeout are not EMPTY.
 * True 404 / missing id / zero-hit JSON remains [] / null.
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

function formatStudy(s: {
  protocolSection: {
    identificationModule: {
      nctId: string
      briefTitle: string
      orgStudyIdInfo?: { id?: string }
      secondaryIdInfos?: { id?: string; type?: string }[]
    }
    statusModule: {
      overallStatus: string
      startDateStruct?: { date: string }
      completionDateStruct?: { date: string }
    }
    designModule?: {
      phases?: string[]
      enrollmentInfo?: { count?: number }
    }
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name: string }
    }
    conditionsModule?: { conditions?: string[] }
    contactsLocationsModule?: {
      locations?: { country: string }[]
    }
    outcomesModule?: {
      primaryOutcomes?: { measure: string }[]
    }
  }
}): ISRCTNTrial {
  const id = s.protocolSection.identificationModule
  const status = s.protocolSection.statusModule
  const design = s.protocolSection.designModule
  const sponsor = s.protocolSection.sponsorCollaboratorsModule
  const conditions = s.protocolSection.conditionsModule
  const locations = s.protocolSection.contactsLocationsModule
  const outcomes = s.protocolSection.outcomesModule

  const isrctnId = id.secondaryIdInfos?.find(si =>
    si.id?.toUpperCase().startsWith('ISRCTN')
  )?.id || id.orgStudyIdInfo?.id || id.nctId

  const country = locations?.locations?.[0]?.country || ''

  return {
    isRCTN: isrctnId || id.nctId,
    title: id.briefTitle || '',
    status: status.overallStatus || 'Unknown',
    phase: design?.phases?.[0] || '',
    recruitmentStatus: status.overallStatus || '',
    sponsor: sponsor?.leadSponsor?.name || '',
    country,
    startDate: status.startDateStruct?.date || '',
    endDate: status.completionDateStruct?.date || '',
    targetEnrollment: design?.enrollmentInfo?.count || 0,
    conditions: conditions?.conditions || [],
    interventions: [],
    outcomes: outcomes?.primaryOutcomes?.map(o => o.measure) || [],
    url: `https://clinicaltrials.gov/study/${id.nctId}`,
  }
}

export async function searchISRCTN(query: string, limit: number = LIMITS.ISRCTN.initial): Promise<ISRCTNTrial[]> {
  const url = `${BASE_URL}?query.term=${encodeURIComponent(query)}&pageSize=${limit}&format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'ISRCTN')

  const data = await res.json()
  const studies = data.studies ?? []

  return studies.map(formatStudy).filter((t: ISRCTNTrial) => t.isRCTN && t.title)
}

export async function getISRCTNTrial(isrctnId: string): Promise<ISRCTNTrial | null> {
  let url: string
  if (isrctnId.toUpperCase().startsWith('ISRCTN')) {
    url = `${BASE_URL}?query.term=${encodeURIComponent(isrctnId)}&pageSize=1&format=json`
  } else {
    url = `${BASE_URL}/${encodeURIComponent(isrctnId)}?format=json`
  }

  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'ISRCTN')

  const data = await res.json()
  if (data.studies?.length) {
    return formatStudy(data.studies[0])
  }
  if (data.protocolSection) {
    return formatStudy(data)
  }
  return null
}

export async function getISRCTNByCountry(country: string, limit: number = LIMITS.ISRCTN.initial): Promise<ISRCTNTrial[]> {
  const url = `${BASE_URL}?query.locn=${encodeURIComponent(country)}&pageSize=${limit}&format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'ISRCTN')

  const data = await res.json()
  const studies = data.studies ?? []

  return studies.map(formatStudy).filter((t: ISRCTNTrial) => t.isRCTN && t.title)
}
