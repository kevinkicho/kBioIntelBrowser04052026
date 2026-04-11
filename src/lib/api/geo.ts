import type { GEODataset } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const GEO_API = 'https://www.ncbi.nlm.nih.gov/geo'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search GEO for gene expression datasets related to a molecule/gene
 */
export async function searchGEO(query: string, limit: number = LIMITS.GEO.initial): Promise<GEODataset[]> {
  try {
    // Search for GEO datasets
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${encodeURIComponent(query)}&retmax=${limit}&retmode=json`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    // Fetch summaries
    const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids.join(',')}&retmode=json`
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const dataset = result[id] || {}
      return {
        geoId: id,
        accession: dataset.accession || dataset.nacc || '',
        title: dataset.title || dataset.summary || '',
        summary: dataset.summary || '',
        organism: dataset.organism || '',
        platformType: dataset.platformtype || '',
        sampleType: dataset.sampletype || '',
        seriesType: dataset.seriestype || '',
        nSamples: parseInt(dataset.nsamples || '0', 10),
        nFeatures: parseInt(dataset.nfeatures || '0', 10),
        releaseDate: dataset.releasedate || dataset.pdat || '',
        lastUpdate: dataset.lastupdate || '',
        url: `${GEO_API}/query/acc.cgi?acc=${dataset.accession || id}`,
      }
    }).filter((d: GEODataset) => d.accession && d.title)
  } catch (error) {
    console.error('GEO search error:', error)
    return []
  }
}

/**
 * Get GEO series (GSE) details by accession
 */
export async function getGEOSeries(accession: string): Promise<GEODataset | null> {
  try {
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${accession}[Accession]&retmax=1&retmode=json`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []
    if (ids.length === 0) return null

    const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids[0]}&retmode=json`
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return null

    const summaryData = await summaryRes.json()
    const dataset = summaryData?.result?.[ids[0]]

    if (!dataset) return null

    return {
      geoId: ids[0],
      accession: dataset.accession || accession,
      title: dataset.title || '',
      summary: dataset.summary || '',
      organism: dataset.organism || '',
      platformType: dataset.platformtype || '',
      sampleType: dataset.sampletype || '',
      seriesType: dataset.seriestype || '',
      nSamples: parseInt(dataset.nsamples || '0', 10),
      nFeatures: parseInt(dataset.nfeatures || '0', 10),
      releaseDate: dataset.releasedate || dataset.pdat || '',
      lastUpdate: dataset.lastupdate || '',
      url: `${GEO_API}/query/acc.cgi?acc=${accession}`,
    }
  } catch (error) {
    console.error('GEO series fetch error:', error)
    return null
  }
}

/**
 * Search GEO profiles (gene expression profiles) by gene symbol
 */
export async function searchGEOProfiles(geneSymbol: string, limit: number = LIMITS.GEO.initial): Promise<GEODataset[]> {
  try {
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${encodeURIComponent(geneSymbol)}[Gene]+AND+gpl[Filter]&retmax=${limit}&retmode=json`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids.join(',')}&retmode=json`
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const dataset = result[id] || {}
      return {
        geoId: id,
        accession: dataset.accession || '',
        title: dataset.title || '',
        summary: dataset.summary || '',
        organism: dataset.organism || '',
        platformType: dataset.platformtype || '',
        sampleType: dataset.sampletype || '',
        seriesType: dataset.seriestype || '',
        nSamples: parseInt(dataset.nsamples || '0', 10),
        nFeatures: parseInt(dataset.nfeatures || '0', 10),
        releaseDate: dataset.releasedate || '',
        lastUpdate: dataset.lastupdate || '',
        url: `${GEO_API}/query/acc.cgi?acc=${dataset.accession || id}`,
      }
    }).filter((d: GEODataset) => d.accession && d.title)
  } catch (error) {
    console.error('GEO profiles search error:', error)
    return []
  }
}