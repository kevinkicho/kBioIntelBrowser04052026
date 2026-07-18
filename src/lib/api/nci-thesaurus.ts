import type { NciConcept } from '../types'

const EVS_BASE = 'https://api-evsrest.nci.nih.gov/api/v1/concept/ncit'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

function pickDefinition(c: {
  definitions?: Array<{ definition?: string; type?: string; source?: string }>
  definition?: string
}): string {
  if (typeof c.definition === 'string' && c.definition.trim()) return c.definition.trim()
  const defs = Array.isArray(c.definitions) ? c.definitions : []
  // Prefer NCI preferred / first non-empty definition
  const preferred =
    defs.find((d) => /preferred|nci/i.test(String(d.type || d.source || ''))) || defs[0]
  return preferred?.definition?.trim() || ''
}

function pickSynonyms(
  c: { synonyms?: Array<{ name?: string; termName?: string }> },
  primaryName: string,
): string[] {
  const raw = Array.isArray(c.synonyms) ? c.synonyms : []
  const seen = new Set<string>()
  const out: string[] = []
  const primary = primaryName.toLowerCase()
  for (const s of raw) {
    const n = String(s.name || s.termName || '').trim()
    if (!n) continue
    const k = n.toLowerCase()
    if (k === primary || seen.has(k)) continue
    seen.add(k)
    out.push(n)
    if (out.length >= 8) break
  }
  return out
}

function pickSemanticType(c: {
  semanticTypes?: Array<{ name?: string }>
  properties?: Array<{ type?: string; value?: string }>
}): string {
  if (Array.isArray(c.semanticTypes) && c.semanticTypes[0]?.name) {
    return String(c.semanticTypes[0].name)
  }
  const props = Array.isArray(c.properties) ? c.properties : []
  const st = props.find((p) => /semantic.?type/i.test(String(p.type || '')))
  return st?.value ? String(st.value) : ''
}

function mapConcept(c: Record<string, unknown>): NciConcept {
  const code = String(c.code ?? '')
  const name = String(c.name ?? '')
  return {
    conceptId: code,
    code,
    name,
    definition: pickDefinition(c as Parameters<typeof pickDefinition>[0]),
    semanticType: pickSemanticType(c as Parameters<typeof pickSemanticType>[0]),
    conceptStatus: String(c.conceptStatus ?? 'DEFAULT'),
    leaf: Boolean(c.leaf),
    synonyms: pickSynonyms(c as Parameters<typeof pickSynonyms>[0], name),
    parents: Array.isArray(c.parents)
      ? (c.parents as Array<{ code?: string }>).map((p) => String(p.code || p)).filter(Boolean)
      : [],
    url: `https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=${encodeURIComponent(code)}`,
  }
}

/**
 * Search NCI Thesaurus (EVS REST). Requests definitions + synonyms so list items can show meaning.
 */
export async function getNciConceptsByName(name: string): Promise<NciConcept[]> {
  try {
    const q = name.trim()
    if (q.length < 2) return []

    // include=summary often carries definitions; fall back to definitions,synonyms if needed
    const url =
      `${EVS_BASE}/search?term=${encodeURIComponent(q)}` +
      `&type=contains&pageSize=12&include=summary,definitions,synonyms,properties`

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const raw = (data.concepts ?? data) as unknown[]
    if (!Array.isArray(raw)) return []

    let concepts = raw.slice(0, 10).map((c) => mapConcept(c as Record<string, unknown>))

    // If search omitted definitions, hydrate top hits from detail endpoint (capped)
    const missing = concepts.filter((c) => !c.definition && c.code).slice(0, 5)
    if (missing.length > 0) {
      const details = await Promise.all(
        missing.map(async (c) => {
          try {
            const dRes = await fetch(
              `${EVS_BASE}/${encodeURIComponent(c.code)}?include=definitions,synonyms,properties`,
              fetchOptions,
            )
            if (!dRes.ok) return null
            return mapConcept((await dRes.json()) as Record<string, unknown>)
          } catch {
            return null
          }
        }),
      )
      const byCode = new Map(
        details.filter(Boolean).map((d) => [d!.code, d!] as const),
      )
      concepts = concepts.map((c) => {
        const d = byCode.get(c.code)
        if (!d) return c
        return {
          ...c,
          definition: c.definition || d.definition,
          synonyms: c.synonyms.length ? c.synonyms : d.synonyms,
          semanticType: c.semanticType || d.semanticType,
        }
      })
    }

    return concepts
  } catch {
    return []
  }
}
