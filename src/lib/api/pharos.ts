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
