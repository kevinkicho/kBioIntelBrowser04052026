import type { MolecularInteraction } from '../types'
import { resolveDrugTargets } from './drugTargetResolve'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * IntAct harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit MITAB / JSON remains [].
 */
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

function assertMitabBody(text: string): void {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) {
    throw new Error('HTML response from IntAct')
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    throw new Error('non-MITAB response from IntAct')
  }
}

/** Legacy IntAct REST (often 404) */
const LEGACY_URL =
  'https://www.ebi.ac.uk/intact/ws/interaction/findInteractor'

/** PSICQUIC IntAct (MITAB tab25) — current free public surface */
const PSICQUIC_URL =
  'https://www.ebi.ac.uk/Tools/webservices/psicquic/intact/webservices/current/search/query'

function parseMitabLine(line: string): MolecularInteraction | null {
  const cols = line.split('\t')
  if (cols.length < 12) return null
  const idA = cols[0] || ''
  const idB = cols[1] || ''
  const altA = cols[2] || ''
  const altB = cols[3] || ''
  const aliasA = cols[4] || ''
  const aliasB = cols[5] || ''
  const method = cols[6] || ''
  const pubs = cols[8] || ''
  const type = cols[11] || ''
  const interactionAc = cols[13] || ''

  const pickName = (alias: string, id: string, alt: string) => {
    const gene = alias.match(/(?:uniprotkb|psi-mi):([A-Za-z0-9-]+)\(gene name\)/i)
    if (gene?.[1]) return gene[1]
    const display = alias.match(/\((?:display_short|gene name)\)[:\s]*([A-Za-z0-9-]+)/i)
    if (display?.[1]) return display[1]
    const uni = (id || alt).match(/uniprotkb:([A-Z0-9-]+)/i)
    if (uni?.[1]) return uni[1]
    return (id || alt || 'unknown').replace(/^[^:]+:/, '').slice(0, 40)
  }

  const nameA = pickName(aliasA, idA, altA)
  const nameB = pickName(aliasB, idB, altB)
  const acMatch = interactionAc.match(/intact:([A-Z0-9-]+)/i)
  const id = acMatch?.[1] || interactionAc || `${nameA}-${nameB}`
  const pubmed = pubs.match(/pubmed:(\d+)/i)?.[1] || ''
  const methodName = method.match(/\(([^)]+)\)/)?.[1] || method
  const typeName = type.match(/\(([^)]+)\)/)?.[1] || type

  return {
    interactionId: id,
    proteinA: nameA,
    proteinB: nameB,
    interactorA: nameA,
    interactorB: nameB,
    interactionType: typeName,
    detectionMethod: methodName,
    pubmedId: pubmed,
    confidenceScore: 0,
    url: acMatch
      ? `https://www.ebi.ac.uk/intact/details/interaction/${acMatch[1]}`
      : `https://www.ebi.ac.uk/intact/search?query=${encodeURIComponent(nameA)}`,
  }
}

async function psicquicByAccession(accession: string, max = 10): Promise<MolecularInteraction[]> {
  const q = `species:human AND id:${encodeURIComponent(accession)}`
  const url = `${PSICQUIC_URL}/${q}?format=tab25&firstResult=0&maxResults=${max}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'IntAct')
  const text = await res.text()
  if (!text.trim()) return []
  assertMitabBody(text)
  const out: MolecularInteraction[] = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const row = parseMitabLine(line)
    if (row) out.push(row)
    if (out.length >= max) break
  }
  return out
}

async function legacyByName(name: string): Promise<MolecularInteraction[]> {
    const url = `${LEGACY_URL}/${encodeURIComponent(name)}?format=json&pageSize=10`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    throwIfHttpFailed(res, 'IntAct')
    const data = await res.json()
    const entries = data?.content ?? data?.data ?? (Array.isArray(data) ? data : [])
    if (!Array.isArray(entries)) return []
    return entries.map((entry: Record<string, unknown>) => {
      const interactorA = (entry as Record<string, Record<string, string>>).interactorA ?? {}
      const interactorB = (entry as Record<string, Record<string, string>>).interactorB ?? {}
      const id = (entry.ac as string) ?? (entry.interactionAc as string) ?? ''
      const nameA = interactorA?.interactorName ?? interactorA?.name ?? ''
      const nameB = interactorB?.interactorName ?? interactorB?.name ?? ''
      return {
        interactionId: id,
        proteinA: nameA,
        proteinB: nameB,
        interactorA: nameA,
        interactorB: nameB,
        interactionType: (entry.interactionType as string) ?? '',
        detectionMethod: (entry.detectionMethod as string) ?? '',
        pubmedId: (entry.pubmedId as string) ?? '',
        confidenceScore: Number(entry.confidenceScore ?? entry.miscore) || 0,
        url: `https://www.ebi.ac.uk/intact/details/interaction/${id}`,
      }
    })
}

/**
 * Molecular interactions for a chemical or protein name.
 * Drug names resolve to target UniProt accessions, then PSICQUIC IntAct.
 */
export async function getMolecularInteractionsByName(name: string): Promise<MolecularInteraction[]> {
    const q = name?.trim()
    if (!q) return []

    // Direct UniProt
    if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(q)) {
      return psicquicByAccession(q.toUpperCase())
    }

    const resolved = await resolveDrugTargets(q, 5)
    const accessions = resolved.uniprotAccessions
    if (accessions.length) {
      const batches = await Promise.all(accessions.slice(0, 3).map((a) => psicquicByAccession(a, 8)))
      const seen = new Set<string>()
      const merged: MolecularInteraction[] = []
      for (const batch of batches) {
        for (const row of batch) {
          const key = row.interactionId || `${row.proteinA}|${row.proteinB}`
          if (seen.has(key)) continue
          seen.add(key)
          merged.push(row)
          if (merged.length >= 15) return merged
        }
      }
      if (merged.length) return merged
    }

    // Gene symbol → PSICQUIC free-text
    for (const gene of resolved.geneSymbols.slice(0, 2)) {
      try {
        const url = `${PSICQUIC_URL}/${encodeURIComponent(`species:human AND gene:${gene}`)}?format=tab25&firstResult=0&maxResults=10`
        const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
        throwIfHttpFailed(res, 'IntAct')
        const text = await res.text()
        if (!text.trim()) continue
        assertMitabBody(text)
        const out: MolecularInteraction[] = []
        for (const line of text.split('\n')) {
          if (!line.trim() || line.startsWith('#')) continue
          const row = parseMitabLine(line)
          if (row) out.push(row)
          if (out.length >= 10) break
        }
        if (out.length) return out
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/HTTP |HTML|non-MITAB|timeout|timed/i.test(msg)) throw err
        /* parse miss — try next gene */
      }
    }

    return await legacyByName(q)
}
