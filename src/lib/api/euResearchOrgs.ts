/**
 * EU research organization packs via free ROR API (country-filtered education / facility / healthcare).
 * No pan-EU hospital registry — honest research-org coverage only.
 * @see docs/design/orgs-hospitals-compendium.md
 */

import { searchRorOrganizations, type RorOrganization } from './ror'

/** Major EU + EEA research-active country codes for multi-country packs */
export const EU_RESEARCH_COUNTRY_CODES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
] as const

/** Commonly used subset for molecule-context multi-search (rate-limit friendly) */
export const EU_CORE_RESEARCH_COUNTRIES = [
  'DE',
  'FR',
  'NL',
  'SE',
  'ES',
  'IT',
  'BE',
  'DK',
  'AT',
  'IE',
] as const

/**
 * Search ROR for research orgs in one EU country (education + healthcare + facility types merged).
 */
export async function searchEuResearchOrgsByCountry(
  query: string,
  countryCode: string,
  limit = 12,
): Promise<RorOrganization[]> {
  const q = query.trim()
  const cc = countryCode.trim().toUpperCase()
  if (!q || q.length < 2 || !cc) return []

  const packs = await Promise.all([
    searchRorOrganizations(q, { countryCode: cc, types: ['education'] }),
    searchRorOrganizations(q, { countryCode: cc, types: ['healthcare'] }),
    searchRorOrganizations(q, { countryCode: cc, types: ['facility'] }),
  ])
  const seen = new Set<string>()
  const out: RorOrganization[] = []
  for (const pack of packs) {
    for (const o of pack) {
      if (seen.has(o.rorId)) continue
      seen.add(o.rorId)
      out.push({ ...o, matchSource: `eu:${cc}` })
      if (out.length >= limit) return out
    }
  }
  return out
}

/**
 * Multi-country EU pack: query across core EU countries (parallel, capped).
 * Use for molecule name / disease context when EU research footprint is useful.
 */
export async function searchEuResearchOrgsPack(
  query: string,
  opts?: { countries?: readonly string[]; perCountry?: number; totalCap?: number },
): Promise<RorOrganization[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const countries = opts?.countries ?? EU_CORE_RESEARCH_COUNTRIES
  const perCountry = opts?.perCountry ?? 3
  const totalCap = opts?.totalCap ?? 20

  const batches = await Promise.all(
    countries.map((cc) => searchEuResearchOrgsByCountry(q, cc, perCountry)),
  )
  const seen = new Set<string>()
  const out: RorOrganization[] = []
  for (const batch of batches) {
    for (const o of batch) {
      if (seen.has(o.rorId)) continue
      seen.add(o.rorId)
      out.push(o)
      if (out.length >= totalCap) return out
    }
  }
  return out
}
