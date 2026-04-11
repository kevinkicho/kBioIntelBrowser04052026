import type { ISRCTNTrial } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://www.isrctn.com/api/v2'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search ISRCTN registry for UK clinical trials
 * ISRCTN is the International Standard Randomised Controlled Trial Number registry
 */
export async function searchISRCTN(query: string, limit: number = LIMITS.ISRCTN.initial): Promise<ISRCTNTrial[]> {
  try {
    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&size=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?._embedded?.trials || searchData?.results || []

    return results.map((trial: Record<string, unknown>) => ({
      isRCTN: String(trial.isrctn || trial.ISRCTN || trial.id || ''),
      title: String(trial.title || trial.public_title || ''),
      status: String(trial.status || trial.overall_status || 'Unknown'),
      phase: String(trial.phase || ''),
      recruitmentStatus: String(trial.recruitment_status || trial.recruitmentStatus || ''),
      sponsor: String(trial.sponsor || trial.primary_sponsor || ''),
      country: Array.isArray(trial.countries) ? trial.countries[0] : String(trial.country || ''),
      startDate: String(trial.start_date || trial.startDate || trial.date_registration || ''),
      endDate: String(trial.end_date || trial.endDate || trial.completion_date || ''),
      targetEnrollment: parseInt(String(trial.target_enrollment || trial.targetEnrollment || trial.participant_count || '0'), 10),
      conditions: Array.isArray(trial.conditions) ? trial.conditions.map(String) : String(trial.health_conditions || '').split(',').map(s => s.trim()).filter(Boolean),
      interventions: Array.isArray(trial.interventions) ? trial.interventions.map(String) : String(trial.interventions || '').split(',').map(s => s.trim()).filter(Boolean),
      outcomes: Array.isArray(trial.outcomes) ? trial.outcomes.map(String) : [],
      url: `https://www.isrctn.com/${trial.isrctn || trial.ISRCTN || trial.id}`,
    })).filter((t: ISRCTNTrial) => t.isRCTN && t.title)
  } catch (error) {
    console.error('ISRCTN search error:', error)
    return []
  }
}

/**
 * Get ISRCTN trial details by ISRCTN ID
 */
export async function getISRCTNTrial(isrctnId: string): Promise<ISRCTNTrial | null> {
  try {
    const trialUrl = `${BASE_URL}/trial/${isrctnId}`
    const trialRes = await fetch(trialUrl, fetchOptions)
    if (!trialRes.ok) return null

    const trial = await trialRes.json()

    return {
      isRCTN: trial.isrctn || trial.ISRCTN || isrctnId,
      title: trial.title || trial.public_title || '',
      status: trial.status || trial.overall_status || 'Unknown',
      phase: trial.phase || '',
      recruitmentStatus: trial.recruitment_status || trial.recruitmentStatus || '',
      sponsor: trial.sponsor || trial.primary_sponsor || '',
      country: Array.isArray(trial.countries) ? trial.countries[0] : trial.country || '',
      startDate: trial.start_date || trial.startDate || trial.date_registration || '',
      endDate: trial.end_date || trial.endDate || trial.completion_date || '',
      targetEnrollment: parseInt(String(trial.target_enrollment || trial.targetEnrollment || trial.participant_count || '0'), 10),
      conditions: Array.isArray(trial.conditions) ? trial.conditions.map(String) : String(trial.health_conditions || '').split(',').map(s => s.trim()).filter(Boolean),
      interventions: Array.isArray(trial.interventions) ? trial.interventions.map(String) : String(trial.interventions || '').split(',').map(s => s.trim()).filter(Boolean),
      outcomes: Array.isArray(trial.outcomes) ? trial.outcomes.map(String) : [],
      url: `https://www.isrctn.com/${isrctnId}`,
    }
  } catch (error) {
    console.error('ISRCTN trial fetch error:', error)
    return null
  }
}

/**
 * Get ISRCTN trials by country
 */
export async function getISRCTNByCountry(country: string, limit: number = LIMITS.ISRCTN.initial): Promise<ISRCTNTrial[]> {
  try {
    const searchUrl = `${BASE_URL}/search?country=${encodeURIComponent(country)}&size=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?._embedded?.trials || searchData?.results || []

    return results.map(formatTrial)
  } catch (error) {
    console.error('ISRCTN country search error:', error)
    return []
  }
}

function formatTrial(trial: Record<string, unknown>): ISRCTNTrial {
  return {
    isRCTN: String(trial.isrctn || trial.ISRCTN || trial.id || ''),
    title: String(trial.title || trial.public_title || ''),
    status: String(trial.status || trial.overall_status || 'Unknown'),
    phase: String(trial.phase || ''),
    recruitmentStatus: String(trial.recruitment_status || trial.recruitmentStatus || ''),
    sponsor: String(trial.sponsor || trial.primary_sponsor || ''),
    country: Array.isArray(trial.countries) ? trial.countries[0] : String(trial.country || ''),
    startDate: String(trial.start_date || trial.startDate || trial.date_registration || ''),
    endDate: String(trial.end_date || trial.endDate || trial.completion_date || ''),
    targetEnrollment: parseInt(String(trial.target_enrollment || trial.targetEnrollment || trial.participant_count || '0'), 10),
    conditions: Array.isArray(trial.conditions) ? trial.conditions.map(String) : String(trial.health_conditions || '').split(',').map(s => s.trim()).filter(Boolean),
    interventions: Array.isArray(trial.interventions) ? trial.interventions.map(String) : String(trial.interventions || '').split(',').map(s => s.trim()).filter(Boolean),
    outcomes: Array.isArray(trial.outcomes) ? trial.outcomes.map(String) : [],
    url: `https://www.isrctn.com/${trial.isrctn || trial.ISRCTN || trial.id}`,
  }
}