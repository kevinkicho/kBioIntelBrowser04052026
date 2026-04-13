import type { DrugGeneInteraction } from '../types'

const GRAPHQL_URL = 'https://dgidb.org/api/graphql'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getDrugGeneInteractionsByName(name: string): Promise<DrugGeneInteraction[]> {
  try {
    const query = `{
      drugs(names: ["${name.replace(/"/g, '\\"')}"]) {
        nodes {
          conceptId
          name
          interactions {
            gene { name conceptId }
            interactionTypes { type }
            sources { sourceDbName }
          }
        }
      }
    }`

    const res = await fetch(GRAPHQL_URL, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) return []
    const data = await res.json()

    if (data.errors) return []

    const nodes = data.data?.drugs?.nodes ?? []
    const allInteractions: DrugGeneInteraction[] = []

    for (const node of nodes) {
      if (!node.interactions?.length) continue
      for (const interaction of node.interactions) {
        const geneName = interaction.gene?.name || ''
        if (!geneName) continue
        allInteractions.push({
          drugName: name,
          geneSymbol: geneName,
          geneName,
          interactionType: (interaction.interactionTypes || []).map((t: { type: string }) => t.type).filter(Boolean).join(', '),
          evidence: (interaction.sources || []).map((s: { sourceDbName: string }) => s.sourceDbName).filter(Boolean).join(', '),
          source: (interaction.sources || []).map((s: { sourceDbName: string }) => s.sourceDbName).filter(Boolean).join(', '),
          score: 0,
          url: `https://dgidb.org/genes/${encodeURIComponent(geneName)}`,
        })
      }
    }

    const seen = new Set<string>()
    return allInteractions.filter(i => {
      const key = `${i.geneName}|${i.interactionType}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 20)
  } catch {
    return []
  }
}