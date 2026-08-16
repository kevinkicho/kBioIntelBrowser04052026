import type { GNPSLibrarySpectrum, GNPSNetworkCluster } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://gnps.ucsd.edu/ProteoSAFe'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * GNPS harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, missing id, and zero-hit JSON remain empty.
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

function formatSpectrum(spectrum: Record<string, unknown>): GNPSLibrarySpectrum {
  return {
    id: String(spectrum.spectrum_id || spectrum.id || ''),
    name: String(spectrum.Compound_Name || spectrum.name || spectrum.compound_name || ''),
    precursorMz: parseFloat(String(spectrum.Precursor_MZ || spectrum.precursorMz || spectrum.precursor_mz || '0')),
    mz: parseFloat(String(spectrum.Parent_Mass || spectrum.mz || '0')),
    ionMode: String(spectrum.Ion_Mode || spectrum.ionMode || spectrum.ion_mode || 'positive'),
    smiles: String(spectrum.SMILES || spectrum.smiles || ''),
    inchi: String(spectrum.INCHI || spectrum.inchi || ''),
    library: String(spectrum.Library_Name || spectrum.library || 'GNPS'),
    sources: Array.isArray(spectrum.Data_Source) ? spectrum.Data_Source.map(String) : [String(spectrum.Data_Source || spectrum.source || 'GNPS')],
    organism: String(spectrum.Organism || spectrum.organism || ''),
    url: `https://gnps.ucsd.edu/ProteoSAFe/spectrum.jsp?SpectrumID=${spectrum.spectrum_id || spectrum.id}`,
  }
}

/**
 * Search GNPS library for mass spectrometry spectra
 * GNPS is Global Natural Products Social Molecular Networking platform
 */
export async function searchGNPSLibrary(query: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/result.jsp?task=library_search&query=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GNPS')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.compounds || []
  return results.map((spectrum: Record<string, unknown>) => formatSpectrum(spectrum)).filter((s: GNPSLibrarySpectrum) => s.id && s.name)
}

/**
 * Search GNPS molecular networks
 */
export async function searchGNPSNetworks(query: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSNetworkCluster[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/result.jsp?task=network_search&query=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GNPS')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.clusters || []
  return results.map((cluster: Record<string, unknown>) => ({
    clusterId: String(cluster.cluster_index || cluster.clusterId || cluster.id || ''),
    parentMass: parseFloat(String(cluster.precursor_mz || cluster.parentMass || cluster.Parent_MZ || '0')),
    ionMode: String(cluster.ionMode || cluster.Ion_Mode || 'positive'),
    spectraCount: parseInt(String(cluster.spectra_count || cluster.spectraCount || '1'), 10),
    connectedComponents: parseInt(String(cluster.connected_components || cluster.connectedComponents || '0'), 10),
    libraryIdentifications: Array.isArray(cluster.library_ids) ? cluster.library_ids.map(String) : String(cluster.library_identifications || '').split(',').map(s => s.trim()).filter(Boolean),
    bestMatch: String(cluster.best_library_match || cluster.Best_Library_Match || cluster.bestMatch || ''),
    url: `https://gnps.ucsd.edu/ProteoSAFe/status.jsp?task=${cluster.task_id || cluster.taskId || ''}`,
  })).filter((c: GNPSNetworkCluster) => c.clusterId)
}

/**
 * Get GNPS spectrum details by ID
 */
export async function getGNPSSpectrum(spectrumId: string): Promise<GNPSLibrarySpectrum | null> {
  const id = spectrumId.trim()
  if (!id) return null
  const spectrumUrl = `${BASE_URL}/spectrum.jsp?SpectrumID=${id}`
  const spectrumRes = await timedFetch(spectrumUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(spectrumRes.status)) return null
  throwIfHttpFailed(spectrumRes, 'GNPS')
  const spectrum = await spectrumRes.json() as Record<string, unknown>
  return formatSpectrum({ ...spectrum, spectrum_id: spectrum.spectrum_id || id })
}

/**
 * Search GNPS by SMILES (structure search)
 */
export async function searchGNPSBySMILES(smiles: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  const q = smiles.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/result.jsp?task=structure_search&smiles=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GNPS')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.compounds || []
  return results.map(formatSpectrum)
}

/**
 * Search GNPS by precursor m/z
 */
export async function searchGNPSByMZ(mz: number, tolerance: number = 0.01, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  const searchUrl = `${BASE_URL}/result.jsp?task=mz_search&precursor_mz=${mz}&tolerance=${tolerance}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GNPS')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.compounds || []
  return results.map(formatSpectrum)
}
