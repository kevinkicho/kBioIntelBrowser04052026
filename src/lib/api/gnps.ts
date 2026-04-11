import type { GNPSLibrarySpectrum, GNPSNetworkCluster } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://gnps.ucsd.edu/ProteoSAFe'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search GNPS library for mass spectrometry spectra
 * GNPS is Global Natural Products Social Molecular Networking platform
 */
export async function searchGNPSLibrary(query: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  try {
    const searchUrl = `${BASE_URL}/result.jsp?task=library_search&query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.compounds || []

    return results.map((spectrum: Record<string, unknown>) => ({
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
    })).filter((s: GNPSLibrarySpectrum) => s.id && s.name)
  } catch (error) {
    console.error('GNPS library search error:', error)
    return []
  }
}

/**
 * Search GNPS molecular networks
 */
export async function searchGNPSNetworks(query: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSNetworkCluster[]> {
  try {
    const searchUrl = `${BASE_URL}/result.jsp?task=network_search&query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

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
  } catch (error) {
    console.error('GNPS network search error:', error)
    return []
  }
}

/**
 * Get GNPS spectrum details by ID
 */
export async function getGNPSSpectrum(spectrumId: string): Promise<GNPSLibrarySpectrum | null> {
  try {
    const spectrumUrl = `${BASE_URL}/spectrum.jsp?SpectrumID=${spectrumId}`
    const spectrumRes = await fetch(spectrumUrl, fetchOptions)
    if (!spectrumRes.ok) return null

    const spectrum = await spectrumRes.json()

    return {
      id: spectrum.spectrum_id || spectrumId,
      name: spectrum.Compound_Name || spectrum.name || '',
      precursorMz: parseFloat(String(spectrum.Precursor_MZ || spectrum.precursorMz || '0')),
      mz: parseFloat(String(spectrum.Parent_Mass || spectrum.mz || '0')),
      ionMode: spectrum.Ion_Mode || spectrum.ionMode || 'positive',
      smiles: spectrum.SMILES || spectrum.smiles || '',
      inchi: spectrum.INCHI || spectrum.inchi || '',
      library: spectrum.Library_Name || spectrum.library || 'GNPS',
      sources: Array.isArray(spectrum.Data_Source) ? spectrum.Data_Source.map(String) : [String(spectrum.Data_Source || 'GNPS')],
      organism: spectrum.Organism || spectrum.organism || '',
      url: `https://gnps.ucsd.edu/ProteoSAFe/spectrum.jsp?SpectrumID=${spectrumId}`,
    }
  } catch (error) {
    console.error('GNPS spectrum fetch error:', error)
    return null
  }
}

/**
 * Search GNPS by SMILES (structure search)
 */
export async function searchGNPSBySMILES(smiles: string, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  try {
    const searchUrl = `${BASE_URL}/result.jsp?task=structure_search&smiles=${encodeURIComponent(smiles)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.compounds || []

    return results.map(formatSpectrum)
  } catch (error) {
    console.error('GNPS SMILES search error:', error)
    return []
  }
}

/**
 * Search GNPS by precursor m/z
 */
export async function searchGNPSByMZ(mz: number, tolerance: number = 0.01, limit: number = LIMITS.GNPS.initial): Promise<GNPSLibrarySpectrum[]> {
  try {
    const searchUrl = `${BASE_URL}/result.jsp?task=mz_search&precursor_mz=${mz}&tolerance=${tolerance}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.compounds || []

    return results.map(formatSpectrum)
  } catch (error) {
    console.error('GNPS m/z search error:', error)
    return []
  }
}

function formatSpectrum(spectrum: Record<string, unknown>): GNPSLibrarySpectrum {
  return {
    id: String(spectrum.spectrum_id || spectrum.id || ''),
    name: String(spectrum.Compound_Name || spectrum.name || ''),
    precursorMz: parseFloat(String(spectrum.Precursor_MZ || spectrum.precursorMz || '0')),
    mz: parseFloat(String(spectrum.Parent_Mass || spectrum.mz || '0')),
    ionMode: String(spectrum.Ion_Mode || spectrum.ionMode || 'positive'),
    smiles: String(spectrum.SMILES || spectrum.smiles || ''),
    inchi: String(spectrum.INCHI || spectrum.inchi || ''),
    library: String(spectrum.Library_Name || spectrum.library || 'GNPS'),
    sources: Array.isArray(spectrum.Data_Source) ? spectrum.Data_Source.map(String) : [String(spectrum.Data_Source || 'GNPS')],
    organism: String(spectrum.Organism || spectrum.organism || ''),
    url: `https://gnps.ucsd.edu/ProteoSAFe/spectrum.jsp?SpectrumID=${spectrum.spectrum_id || spectrum.id}`,
  }
}