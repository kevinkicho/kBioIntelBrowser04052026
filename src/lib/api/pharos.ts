import type { PharosTarget } from '../types'

const PHAROS_URL = 'https://pharos-api.ncats.io/graphql'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

const QUERY = `
query targetSearch($name: String!) {
  targets(filter: { facets: [{ facet: "Ligand", values: [$name] }] }, top: 10) {
    targets {
      name
      tdl
      fam
      description
      novelty
      sym
    }
  }
}
`

export async function getPharosTargetsByName(name: string): Promise<PharosTarget[]> {
  try {
    const res = await fetch(PHAROS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { name } }),
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()
    const targets = data?.data?.targets?.targets ?? []

    return targets.slice(0, 10).map((t: Record<string, unknown>) => ({
      name: (t.name as string) ?? '',
      tdl: (t.tdl as string) ?? '',
      family: (t.fam as string) ?? '',
      description: (t.description as string) ?? '',
      novelty: Number(t.novelty) || 0,
      url: `https://pharos.nih.gov/targets/${encodeURIComponent((t.sym as string) ?? (t.name as string) ?? '')}`,
    }))
  } catch {
    return []
  }
}

const TARGET_BY_SYM = `
query targetDetails($sym: String!) {
  target(q: { sym: $sym }) {
    name
    tdl
    fam
    description
    novelty
    sym
  }
}
`

export type PharosTdl = 'Tclin' | 'Tchem' | 'Tbio' | 'Tdark' | string

/**
 * Look up Target Development Level for a gene symbol (V2-10).
 * Returns null on empty/error so UI can hide the badge.
 */
export async function getPharosTdlBySymbol(
  symbol: string,
): Promise<{ tdl: PharosTdl; name: string; url: string } | null> {
  const sym = symbol.trim()
  if (!sym) return null
  try {
    const res = await fetch(PHAROS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: TARGET_BY_SYM, variables: { sym } }),
      ...fetchOptions,
    })
    if (!res.ok) return null
    const data = await res.json()
    const t = data?.data?.target
    if (!t || typeof t.tdl !== 'string' || !t.tdl.trim()) return null
    const gene = (t.sym as string) || sym
    return {
      tdl: t.tdl.trim(),
      name: (t.name as string) || gene,
      url: `https://pharos.nih.gov/targets/${encodeURIComponent(gene)}`,
    }
  } catch {
    return null
  }
}

/** Batch TDL lookup with concurrency limit (client-safe). */
export async function getPharosTdlBatch(
  symbols: string[],
  concurrency = 3,
): Promise<Record<string, PharosTdl>> {
  const out: Record<string, PharosTdl> = {}
  const list = symbols.map((s) => s.trim()).filter(Boolean).slice(0, 20)
  let i = 0
  async function worker() {
    while (i < list.length) {
      const idx = i++
      const sym = list[idx]
      const hit = await getPharosTdlBySymbol(sym)
      if (hit) out[sym.toUpperCase()] = hit.tdl
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, () => worker()))
  return out
}
