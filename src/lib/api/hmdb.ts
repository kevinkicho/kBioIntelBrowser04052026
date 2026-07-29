import type { HMDBMetabolite } from '../types'
import { stripHtml } from '../utils'

const BASE_URL = 'https://hmdb.ca'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

export async function searchMetabolites(query: string): Promise<HMDBMetabolite[]> {
  try {
    const url = `${BASE_URL}/unearth/q?query=${encodeURIComponent(query)}&search_type=contains`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'BioIntel/0.1 (research; +https://github.com/kevinkicho/kBioIntelBrowser04052026)',
      },
    })
    if (!res.ok) return []
    const text = await res.text()
    const metaboliteLinks = text.match(/\/metabolites\/HMDB\d+/g) ?? []
    const uniqueIds = Array.from(new Set(metaboliteLinks.map((l) => l.split('/')[2]))).slice(0, 10)
    const metabolites = await Promise.all(uniqueIds.slice(0, 5).map((id) => getMetaboliteById(id)))
    return metabolites.filter((m): m is HMDBMetabolite => m !== null)
  } catch {
    return []
  }
}

export async function getMetaboliteById(hmdbId: string): Promise<HMDBMetabolite | null> {
  try {
    const url = `${BASE_URL}/metabolites/${hmdbId}.xml`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        Accept: 'application/xml,text/xml,*/*',
        'User-Agent': 'BioIntel/0.1 (research; +https://github.com/kevinkicho/kBioIntelBrowser04052026)',
      },
    })
    if (!res.ok) return null
    const text = await res.text()

    const nameMatch = text.match(/<name>([^<]+)<\/name>/)
    const formulaMatch = text.match(/<formula>([^<]*)<\/formula>/)
    const massMatch = text.match(/<average_molecular_weight>([^<]*)<\/average_molecular_weight>/)
    const smilesMatch = text.match(/<smiles>([^<]*)<\/smiles>/)
    const inchiMatch = text.match(/<inchi>([^<]*)<\/inchi>/)
    const inchiKeyMatch = text.match(/<inchikey>([^<]*)<\/inchikey>/)
    const descriptionMatch = text.match(/<description>([^<]*)<\/description>/)
    const description = stripHtml(descriptionMatch?.[1] ?? '')

    const biospecimenMatches = text.match(/<biospecimen>([^<]+)<\/biospecimen>/g) ?? []
    const biospecimens = biospecimenMatches.map((m) => m.replace(/<\/?biospecimen>/g, ''))
    const tissueMatches = text.match(/<tissue>([^<]+)<\/tissue>/g) ?? []
    const tissues = tissueMatches.map((m) => m.replace(/<\/?tissue>/g, ''))
    const pathwayMatches = text.match(/<pathway>[\s\S]*?<name>([^<]+)<\/name>/g) ?? []
    const pathways = pathwayMatches
      .map((m) => {
        const nm = m.match(/<name>([^<]+)<\/name>/)
        return nm?.[1] ?? ''
      })
      .filter(Boolean)

    return {
      hmdbId: hmdbId,
      name: nameMatch?.[1] ?? '',
      formula: formulaMatch?.[1] ?? '',
      molecularWeight: parseFloat(massMatch?.[1] ?? '0'),
      smiles: smilesMatch?.[1] ?? '',
      inchi: inchiMatch?.[1] ?? '',
      inchiKey: inchiKeyMatch?.[1] ?? '',
      description,
      biospecimens: biospecimens.slice(0, 10),
      tissues: tissues.slice(0, 10),
      pathways: pathways.slice(0, 10),
      url: `${BASE_URL}/metabolites/${hmdbId}`,
    }
  } catch {
    return null
  }
}

/** UniChem source 18 ≈ HMDB when available; free EBI bridge. */
async function hmdbIdFromInchiKey(inchiKey: string): Promise<string | null> {
  try {
    const url = `https://www.ebi.ac.uk/unichem/rest/verbose_inchikey/${encodeURIComponent(inchiKey)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    // Response shape varies: array of { src_id, src_compound_id } or nested
    const rows = Array.isArray(data) ? data : data?.sources ?? []
    for (const row of rows) {
      const srcId = Number(row.src_id ?? row.sourceID ?? 0)
      const cid = String(row.src_compound_id ?? row.compoundId ?? '')
      // UniChem HMDB is commonly src_id 18
      if ((srcId === 18 || String(row.name || '').toLowerCase().includes('hmdb')) && /HMDB/i.test(cid)) {
        return cid.toUpperCase().startsWith('HMDB') ? cid.toUpperCase() : `HMDB${cid.padStart(7, '0')}`
      }
      if (/^HMDB\d+$/i.test(cid)) return cid.toUpperCase()
    }
    return null
  } catch {
    return null
  }
}

/** Free ChEBI description as metabolite-shaped rows when HMDB is blocked (403). */
async function chebiMetaboliteFallback(name: string): Promise<HMDBMetabolite[]> {
  try {
    const { getChebiAnnotationByName } = await import('./chebi')
    const ann = await getChebiAnnotationByName(name)
    if (!ann) return []
    return [
      {
        hmdbId: ann.chebiId || '',
        name: ann.name || name,
        formula: '',
        molecularWeight: 0,
        smiles: '',
        inchi: '',
        inchiKey: '',
        description: stripHtml(ann.definition || '').slice(0, 500),
        biospecimens: [],
        tissues: [],
        pathways: (ann.roles || []).slice(0, 10),
        url:
          ann.url ||
          (ann.chebiId
            ? `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${ann.chebiId}`
            : 'https://www.ebi.ac.uk/chebi/'),
      },
    ]
  } catch {
    return []
  }
}

export async function getHMDBData(
  name: string,
  opts?: { inchiKey?: string | null },
): Promise<{ metabolites: HMDBMetabolite[] }> {
  const q = (name || '').trim()
  if (!q && !opts?.inchiKey) return { metabolites: [] }

  const idMatch = q.match(/^(?:HMDB)?0*(\d{1,7})$/i) || q.match(/^(HMDB\d+)$/i)
  if (idMatch) {
    const raw = idMatch[1]
    const hmdbId = raw.toUpperCase().startsWith('HMDB')
      ? raw.toUpperCase()
      : `HMDB${raw.padStart(7, '0')}`
    const byId = await getMetaboliteById(hmdbId)
    if (byId) return { metabolites: [byId] }
  }

  if (opts?.inchiKey?.trim()) {
    const bridged = await hmdbIdFromInchiKey(opts.inchiKey.trim())
    if (bridged) {
      const byId = await getMetaboliteById(bridged)
      if (byId) return { metabolites: [byId] }
    }
  }

  let metabolites = q ? await searchMetabolites(q) : []

  if (metabolites.length > 1 && q) {
    const ql = q.toLowerCase()
    metabolites = [
      ...metabolites.filter((m) => m.name?.toLowerCase() === ql),
      ...metabolites.filter((m) => m.name?.toLowerCase() !== ql),
    ]
  }

  if (opts?.inchiKey?.trim() && metabolites.length > 0) {
    const key = opts.inchiKey.trim().toUpperCase()
    const keyed = metabolites.filter((m) => (m.inchiKey || '').toUpperCase() === key)
    if (keyed.length > 0) metabolites = keyed
  }

  if (metabolites.length === 0 && q) {
    metabolites = await chebiMetaboliteFallback(q)
  }

  return { metabolites: metabolites.slice(0, 10) }
}
