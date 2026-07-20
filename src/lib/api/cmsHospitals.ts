/**
 * US Medicare-registered hospitals via CMS Provider Data Catalog (free).
 * Dataset: Hospital General Information (xubh-q36u).
 * @see https://data.cms.gov/provider-data/dataset/xubh-q36u
 * @see docs/design/orgs-hospitals-compendium.md
 */

const DATASTORE =
  'https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0'

const fetchOptions: RequestInit = {
  next: { revalidate: 604800 }, // 7 days
  headers: { Accept: 'application/json' },
}

export interface CmsHospital {
  facilityId: string
  facilityName: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  hospitalType: string
  ownership: string
  emergencyServices: string
  overallRating: string
  /** Medicare Care Compare hospital search deep link */
  careCompareUrl: string
  matchSource?: string
}

function mapRow(r: Record<string, unknown>, matchSource?: string): CmsHospital | null {
  const facilityName = String(r.facility_name || r.Facility_Name || '').trim()
  const facilityId = String(r.facility_id || r.Facility_ID || '').trim()
  if (!facilityName && !facilityId) return null
  const state = String(r.state || r.State || '').trim()
  return {
    facilityId,
    facilityName,
    address: String(r.address || r.Address || '').trim(),
    city: String(r.citytown || r.City_Town || r.city || '').trim(),
    state,
    zip: String(r.zip_code || r.ZIP_Code || '').trim(),
    phone: String(r.telephone_number || r.Phone_Number || '').trim(),
    hospitalType: String(r.hospital_type || r.Hospital_Type || '').trim(),
    ownership: String(r.hospital_ownership || r.Hospital_Ownership || '').trim(),
    emergencyServices: String(r.emergency_services || r.Emergency_Services || '').trim(),
    overallRating: String(
      r.hospital_overall_rating || r.Hospital_overall_rating || '',
    ).trim(),
    careCompareUrl: `https://www.medicare.gov/care-compare/results?searchType=Hospital&keyword=${encodeURIComponent(facilityName)}`,
    matchSource,
  }
}

/**
 * Keyword search CMS Hospital General Information (public datastore API).
 */
export async function searchCmsHospitalsByName(
  query: string,
  limit = 20,
): Promise<CmsHospital[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const params = new URLSearchParams({
    limit: String(Math.min(50, Math.max(1, limit))),
    offset: '0',
    keyword: q,
  })
  try {
    const res = await fetch(`${DATASTORE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Record<string, unknown>[] }
    return (data.results ?? [])
      .map((row) => mapRow(row, 'keyword'))
      .filter((h): h is CmsHospital => h != null)
      .slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Resolve hospital-like org names (trial facilities / sponsors) against CMS.
 */
export async function resolveCmsHospitalsByNames(
  names: string[],
  limit = 10,
): Promise<CmsHospital[]> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const n of names) {
    const t = n.trim()
    if (!t || t.length < 4) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(t)
    if (unique.length >= limit) break
  }
  const out: CmsHospital[] = []
  const byId = new Set<string>()
  for (const name of unique) {
    const hits = await searchCmsHospitalsByName(name, 3)
    for (const h of hits) {
      if (byId.has(h.facilityId)) continue
      byId.add(h.facilityId)
      out.push({ ...h, matchSource: `name:${name}` })
      if (out.length >= limit) return out
    }
  }
  return out
}
