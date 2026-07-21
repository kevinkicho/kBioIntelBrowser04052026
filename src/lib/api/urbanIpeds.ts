/**
 * Urban Institute Education Data Portal — IPEDS directory (free, no API key).
 * Reliable for unitid lookup; full name filters are not supported well (returns full universe).
 * Used to enrich Scorecard / OpenAlex college rows.
 * @see https://educationdata.urban.org/documentation/colleges.html
 */

const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds/directory'
/** Prefer a recent year known to work; fall back if needed */
const YEARS = [2022, 2021, 2020] as const

const fetchOptions: RequestInit = {
  next: { revalidate: 604800 },
  headers: { Accept: 'application/json' },
}

export interface UrbanIpedsInstitution {
  unitid: string
  name: string
  alias: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  website: string | null
  sector: string
  control: string
  hbcu: boolean
  medicalDegree: boolean
  hospital: boolean
  year: number
}

const CONTROL: Record<string, string> = {
  '1': 'Public',
  '2': 'Private nonprofit',
  '3': 'Private for-profit',
}

function mapRow(raw: Record<string, unknown>, year: number): UrbanIpedsInstitution | null {
  const unitid = String(raw.unitid ?? '').trim()
  const name = String(raw.inst_name ?? '').trim()
  if (!unitid && !name) return null
  const web = String(raw.inst_url ?? raw.website_url ?? '').trim()
  const control = String(raw.inst_control ?? '')
  return {
    unitid,
    name,
    alias: String(raw.inst_alias ?? '').trim(),
    address: String(raw.address ?? '').trim(),
    city: String(raw.city ?? '').trim(),
    state: String(raw.state_abbr ?? '').trim(),
    zip: String(raw.zip ?? '').trim(),
    phone: String(raw.phone_number ?? '').trim(),
    website: web
      ? web.startsWith('http')
        ? web
        : `https://${web.replace(/\/$/, '')}`
      : null,
    sector: String(raw.sector ?? '').trim(),
    control: CONTROL[control] || control || '',
    hbcu: Number(raw.hbcu) === 1,
    medicalDegree: Number(raw.medical_degree) === 1,
    hospital: Number(raw.hospital) === 1,
    year,
  }
}

/**
 * Fetch a single IPEDS directory row by UNITID (zero key).
 */
export async function getUrbanIpedsByUnitid(unitid: string): Promise<UrbanIpedsInstitution | null> {
  const id = unitid.trim().replace(/\D/g, '')
  if (!id) return null
  for (const year of YEARS) {
    try {
      const url = `${BASE}/${year}/?unitid=${encodeURIComponent(id)}`
      const res = await fetch(url, fetchOptions)
      if (!res.ok) continue
      const data = (await res.json()) as { results?: Record<string, unknown>[] }
      const row = data.results?.[0]
      if (!row) continue
      return mapRow(row, year)
    } catch {
      continue
    }
  }
  return null
}
