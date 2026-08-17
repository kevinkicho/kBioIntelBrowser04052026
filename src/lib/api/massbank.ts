import type { MassBankSpectrum } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://massbank.eu/MassBank-api'
const fetchOptions: RequestInit = { cache: 'no-store' }

/**
 * MassBank harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404, and zero-hit JSON remain empty.
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

function parseRecord(record: Record<string, unknown>): MassBankSpectrum {
  const compound = (record.compound ?? {}) as Record<string, unknown>
  const names = Array.isArray(compound.names) ? compound.names as string[] : []
  const acquisition = (record.acquisition ?? {}) as Record<string, unknown>
  const ms = (acquisition.mass_spectrometry ?? {}) as Record<string, unknown>
  const subtags = Array.isArray(ms.subtags) ? ms.subtags as Record<string, string>[] : []

  const accession = String(record.accession ?? '')
  const ionMode = String(ms.ion_mode ?? '')
  const instrument = String(acquisition.instrument ?? '')
  const msType = String(ms.ms_type ?? 'MS2')

  let collisionEnergy = ''
  let msLevel = 2
  for (const tag of subtags) {
    if (tag.subtag === 'COLLISION_ENERGY') collisionEnergy = String(tag.value ?? '')
    if (tag.subtag === 'MS_TYPE' || tag.subtag === 'MS_LEVEL') {
      const val = String(tag.value ?? '')
      const match = val.match(/(\d+)/)
      if (match) msLevel = parseInt(match[1], 10)
    }
  }

  const msLevelNum = msType.startsWith('MS') ? parseInt(msType.replace('MS', ''), 10) || 2 : 2

  const precursorMz = parseFloat(String(ms.precursor_mz ?? compound.precursor_mz ?? '0')) || 0

  return {
    accession,
    name: names.length > 0 ? names[0] : accession,
    formula: String(compound.formula ?? ''),
    mass: parseFloat(String(compound.mass ?? '0')),
    ionMode,
    instrument,
    collisionEnergy,
    precursorMz,
    msLevel: msLevelNum || msLevel,
    url: `https://massbank.eu/MassBank/Record.jsp?id=${accession}`,
  }
}

export async function searchMassBank(query: string, limit: number = LIMITS.MASSBANK.initial): Promise<MassBankSpectrum[]> {
  const q = (query || '').trim()
  if (!q) return []

  const url = `${BASE_URL}/records?compound_name=${encodeURIComponent(q)}&limit=${limit}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 12000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'MassBank')
  const records = await res.json()
  if (!Array.isArray(records)) return []

  return records.slice(0, limit).map((r) => parseRecord(r as Record<string, unknown>))
}

export async function getMassBankSpectrum(accession: string): Promise<MassBankSpectrum | null> {
  const id = (accession || '').trim()
  if (!id) return null

  const spectrumUrl = `${BASE_URL}/records/${encodeURIComponent(id)}`
  const res = await timedFetch(spectrumUrl, { ...fetchOptions, timeoutMs: 12000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'MassBank')
  const record = await res.json()
  if (!record || typeof record !== 'object') return null
  return parseRecord(record as Record<string, unknown>)
}
