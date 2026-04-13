import type { MassBankSpectrum } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://massbank.eu/MassBank-api'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

const MAX_RESPONSE_SIZE = 2 * 1024 * 1024

async function fetchWithSizeLimit(url: string): Promise<unknown[] | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null

    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return null
    }

    const text = await res.text()
    if (text.length > MAX_RESPONSE_SIZE) {
      return null
    }

    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
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
  try {
    const url = `${BASE_URL}/records?compound_name=${encodeURIComponent(query)}&limit=${limit}`
    const records = await fetchWithSizeLimit(url)
    if (!records) return []

    return records.slice(0, limit).map((r) => parseRecord(r as Record<string, unknown>))
  } catch {
    return []
  }
}

export async function getMassBankSpectrum(accession: string): Promise<MassBankSpectrum | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const spectrumUrl = `${BASE_URL}/records/${encodeURIComponent(accession)}`
    const res = await fetch(spectrumUrl, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null

    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return null
    }

    const record = await res.json()
    return parseRecord(record as Record<string, unknown>)
  } catch {
    return null
  }
}