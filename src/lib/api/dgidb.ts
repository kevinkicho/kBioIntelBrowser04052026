import type { DrugGeneInteraction } from '../types'

const GRAPHQL_URL = 'https://dgidb.org/api/graphql'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface TargetRelatedMolecule {
  name: string
  sharedTargets: string[]
  interactionTypes: string[]
  sources: string[]
}

export async function getTargetRelatedMolecules(geneSymbols: string[], excludeDrugName: string): Promise<TargetRelatedMolecule[]> {
  if (geneSymbols.length === 0) return []
  try {
    const topGenes = geneSymbols.slice(0, 8)
    const geneFilters = topGenes.map(g => `"${g.replace(/"/g, '\\"')}"`).join(',')
    const query = `{
      genes(names: [${geneFilters}]) {
        nodes {
          name
          interactions {
            drug { name conceptId }
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

    const geneNodes = data.data?.genes?.nodes ?? []
    const drugMap = new Map<string, { targets: Set<string>; types: Set<string>; sources: Set<string> }>()

    for (const geneNode of geneNodes) {
      const geneName = geneNode.name
      if (!geneName || !geneNode.interactions?.length) continue
      for (const ix of geneNode.interactions) {
        const drugName = ix.drug?.name
        if (!drugName || drugName.toLowerCase() === excludeDrugName.toLowerCase()) continue
        if (!drugMap.has(drugName)) {
          drugMap.set(drugName, { targets: new Set(), types: new Set(), sources: new Set() })
        }
        const entry = drugMap.get(drugName)!
        entry.targets.add(geneName)
        for (const t of (ix.interactionTypes || [])) {
          if (t.type) entry.types.add(t.type)
        }
        for (const s of (ix.sources || [])) {
          if (s.sourceDbName) entry.sources.add(s.sourceDbName)
        }
      }
    }

    return Array.from(drugMap.entries())
      .map(([name, entry]) => ({
        name,
        sharedTargets: Array.from(entry.targets),
        interactionTypes: Array.from(entry.types),
        sources: Array.from(entry.sources),
      }))
      .sort((a, b) => b.sharedTargets.length - a.sharedTargets.length)
      .slice(0, 8)
  } catch {
    return []
  }
}

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