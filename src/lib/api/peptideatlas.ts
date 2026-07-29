import type { PeptideAtlasEntry } from '../types'

const BASE_URL = 'https://www.peptideatlas.org/api'
const EBI_PROTEINS = 'https://www.ebi.ac.uk/proteins/api'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

export async function searchPeptides(query: string): Promise<PeptideAtlasEntry[]> {
  try {
    const url = `${BASE_URL}/peptide_search.php?query=${encodeURIComponent(query)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.peptides ?? []).map((peptide: Record<string, unknown>) => ({
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
    }))
  } catch {
    return []
  }
}

export async function getPeptidesByProtein(proteinAccession: string): Promise<PeptideAtlasEntry[]> {
  try {
    // 1) Legacy PeptideAtlas REST (often 404)
    try {
      const url = `${BASE_URL}/protein_peptides.php?protein=${encodeURIComponent(proteinAccession)}&limit=50`
      const res = await fetch(url, fetchOptions)
      if (res.ok) {
        const data = await res.json()
        const rows = (data.peptides ?? []).map((peptide: Record<string, unknown>) => ({
          peptideId: (peptide.peptide_id as string) ?? '',
          sequence: (peptide.sequence as string) ?? '',
          length: ((peptide.sequence as string)?.length) ?? 0,
          proteinNames: [proteinAccession],
          geneSymbols: ((peptide.genes as string) ?? '').split(';').slice(0, 5),
          organism: (peptide.organism as string) ?? 'Homo sapiens',
          tissueSource: (peptide.tissue as string) ?? '',
          sampleSource: (peptide.sample_type as string) ?? '',
          observations: (peptide.observations as number) ?? 0,
          bestScore: (peptide.best_score as number) ?? 0,
          source: 'PeptideAtlas',
          url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`,
        }))
        if (rows.length) return rows
      }
    } catch {
      /* fall through */
    }

    // 2) Free EBI Proteins API — proteomics peptides mapped from PeptideAtlas etc.
    const ebiUrl = `${EBI_PROTEINS}/proteomics/${encodeURIComponent(proteinAccession)}`
    const res = await fetch(ebiUrl, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
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
  } catch {
    return []
  }
}

export async function getPeptidesByTissue(tissue: string): Promise<PeptideAtlasEntry[]> {
  try {
    const url = `${BASE_URL}/tissue_peptides.php?tissue=${encodeURIComponent(tissue)}&limit=30`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.peptides ?? []).slice(0, 30).map((peptide: Record<string, unknown>) => ({
      peptideId: (peptide.peptide_id as string) ?? '',
      sequence: (peptide.sequence as string) ?? '',
      length: ((peptide.sequence as string)?.length) ?? 0,
      proteinNames: ((peptide.proteins as string) ?? '').split(';').slice(0, 5),
      geneSymbols: ((peptide.genes as string) ?? '').split(';').slice(0, 5),
      organism: (peptide.organism as string) ?? 'Homo sapiens',
      tissueSource: tissue,
      sampleSource: (peptide.sample_type as string) ?? '',
      observations: (peptide.observations as number) ?? 0,
      bestScore: (peptide.best_score as number) ?? 0,
      source: 'PeptideAtlas',
      url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`,
    }))
  } catch {
    return []
  }
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
  try {
    const { getUniprotEntriesByName } = await import('./uniprot')
    const entries = await getUniprotEntriesByName(query)
    for (const e of entries.slice(0, 2)) {
      if (!e.accession) continue
      const rows = await getPeptidesByProtein(e.accession)
      if (rows.length) return { peptides: rows.slice(0, 20) }
    }
  } catch {
    /* ignore */
  }

  return { peptides: [] }
}
