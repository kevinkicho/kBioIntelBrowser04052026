import type { PeptideAtlasEntry } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.peptideatlas.org/api'
const EBI_PROTEINS = 'https://www.ebi.ac.uk/proteins/api'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

/**
 * PeptideAtlas harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains []. Legacy PeptideAtlas 404 falls through
 * to EBI Proteins; if that fallback also fails, the error is thrown.
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

function mapPeptideAtlasRow(
  peptide: Record<string, unknown>,
  extras: Partial<PeptideAtlasEntry> = {},
): PeptideAtlasEntry {
  return {
    peptideId: (peptide.peptide_id as string) ?? '',
    sequence: (peptide.sequence as string) ?? '',
    length: ((peptide.sequence as string)?.length) ?? 0,
    proteinNames: ((peptide.proteins as string) ?? '').split(';').slice(0, 5),
    geneSymbols: ((peptide.genes as string) ?? '').split(';').slice(0, 5),
    organism: (peptide.organism as string) ?? 'Homo sapiens',
    tissueSource: (peptide.tissue as string) ?? '',
    sampleSource: (peptide.sample_type as string) ?? '',
    observations: (peptide.observations as number) ?? 0,
    bestScore: (peptide.best_score as number) ?? 0,
    source: 'PeptideAtlas',
    url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`,
    ...extras,
  }
}

export async function searchPeptides(query: string): Promise<PeptideAtlasEntry[]> {
  const url = `${BASE_URL}/peptide_search.php?query=${encodeURIComponent(query)}&limit=20`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'PeptideAtlas')
  const data = await res.json()
  return (data.peptides ?? []).map((peptide: Record<string, unknown>) => mapPeptideAtlasRow(peptide))
}

export async function getPeptidesByProtein(proteinAccession: string): Promise<PeptideAtlasEntry[]> {
  let primaryError: (Error & { status?: number }) | null = null

  // 1) Legacy PeptideAtlas REST (often 404)
  const url = `${BASE_URL}/protein_peptides.php?protein=${encodeURIComponent(proteinAccession)}&limit=50`
  const paRes = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (paRes.ok) {
    throwIfHttpFailed(paRes, 'PeptideAtlas')
    const data = await paRes.json()
    const rows = (data.peptides ?? []).map((peptide: Record<string, unknown>) =>
      mapPeptideAtlasRow(peptide, { proteinNames: [proteinAccession] }),
    )
    if (rows.length) return rows
  } else if (!isAbsentStatus(paRes.status)) {
    const err = new Error(`HTTP ${paRes.status}`) as Error & { status?: number }
    err.status = paRes.status
    primaryError = err
  }

  // 2) Free EBI Proteins API — proteomics peptides mapped from PeptideAtlas etc.
  const ebiUrl = `${EBI_PROTEINS}/proteomics/${encodeURIComponent(proteinAccession)}`
  const res = await timedFetch(ebiUrl, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) {
    if (primaryError) throw primaryError
    return []
  }
  if (!res.ok) {
    if (primaryError) throw primaryError
    throwIfHttpFailed(res, 'PeptideAtlas')
  }
  throwIfHttpFailed(res, 'PeptideAtlas')
  const data = await res.json()
  // Response: array of features with peptide sequences
  const features = Array.isArray(data) ? data : data.features ?? data.proteomics ?? []
  const out: PeptideAtlasEntry[] = []
  for (const f of features as Array<Record<string, unknown>>) {
    const seq =
      (f.peptide as string) ||
      (f.sequence as string) ||
      (f.peptideSequence as string) ||
      ''
    if (!seq || seq.length < 5) continue
    const begin = f.begin ?? f.start
    const end = f.end
    const xrefs = Array.isArray(f.xrefs) ? (f.xrefs as Array<{ id?: string }>) : []
    const peptideId = String(
      f.peptideUniqueID ||
        f.uniqueId ||
        xrefs[0]?.id ||
        `${proteinAccession}:${begin}-${end}`,
    )
    out.push({
      peptideId,
      sequence: seq,
      length: seq.length,
      proteinNames: [proteinAccession],
      geneSymbols: [],
      organism: 'Homo sapiens',
      tissueSource: String(f.tissue || ''),
      sampleSource: String(f.dbSources || f.source || 'EBI Proteins proteomics'),
      observations: Number(f.numberOfUniquePeptides || f.observations || 1) || 1,
      bestScore: Number(f.score || 0) || 0,
      source: 'EBI Proteins (PeptideAtlas/MaxQB map)',
      url: `https://www.ebi.ac.uk/proteins/api/proteomics/${proteinAccession}`,
    })
    if (out.length >= 30) break
  }
  return out
}

export async function getPeptidesByTissue(tissue: string): Promise<PeptideAtlasEntry[]> {
  const url = `${BASE_URL}/tissue_peptides.php?tissue=${encodeURIComponent(tissue)}&limit=30`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'PeptideAtlas')
  const data = await res.json()
  return (data.peptides ?? []).slice(0, 30).map((peptide: Record<string, unknown>) =>
    mapPeptideAtlasRow(peptide, { tissueSource: tissue }),
  )
}

export async function getPeptideAtlasData(query: string): Promise<{ peptides: PeptideAtlasEntry[] }> {
  // Accession → proteomics path
  if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(query.trim())) {
    const peptides = await getPeptidesByProtein(query.trim().toUpperCase())
    if (peptides.length) return { peptides: peptides.slice(0, 20) }
  }

  const peptides = await searchPeptides(query)
  if (peptides.length) return { peptides: peptides.slice(0, 20) }

  // Gene symbol → UniProt accession → proteomics
  const { getUniprotEntriesByName } = await import('./uniprot')
  const entries = await getUniprotEntriesByName(query)
  for (const e of entries.slice(0, 2)) {
    if (!e.accession) continue
    const rows = await getPeptidesByProtein(e.accession)
    if (rows.length) return { peptides: rows.slice(0, 20) }
  }

  return { peptides: [] }
}
