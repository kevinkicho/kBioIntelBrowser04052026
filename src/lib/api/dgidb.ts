import type { DrugGeneInteraction } from '../types'

const GRAPHQL_URL = 'https://dgidb.org/api/graphql'
const DGIDB_WEB = 'https://www.dgidb.org'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * DGIdb v5 React SPA gene pages are keyed by conceptId (e.g. hgnc:5743),
 * not gene symbols. `/genes/PTGS2` 404s client-side.
 */
export function dgidbGeneDeepLink(
  conceptId: string | null | undefined,
  geneName: string,
): string {
  const id = (conceptId || '').trim()
  // Allow typical normalizer IDs: hgnc:3827, ncbigene:5743, iuphar.ligand:6239
  if (id && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) {
    return `${DGIDB_WEB}/genes/${id}`
  }
  const term = geneName.trim()
  if (term) {
    return `${DGIDB_WEB}/results?searchType=gene&searchTerms=${encodeURIComponent(term)}`
  }
  return `${DGIDB_WEB}/results`
}

/** Drug record or interaction-results search on DGIdb v5. */
export function dgidbDrugDeepLink(
  conceptId: string | null | undefined,
  drugName: string,
): string {
  const id = (conceptId || '').trim()
  if (id && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) {
    return `${DGIDB_WEB}/drugs/${id}`
  }
  const term = drugName.trim()
  if (term) {
    return `${DGIDB_WEB}/results?searchType=drug&searchTerms=${encodeURIComponent(term)}`
  }
  return `${DGIDB_WEB}/results`
}

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
    const query = `query($names: [String!]) {
      genes(names: $names) {
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
      body: JSON.stringify({ query, variables: { names: topGenes } }),
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
    const query = `query($names: [String!]) {
      drugs(names: $names) {
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
      body: JSON.stringify({ query, variables: { names: [name] } }),
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
        const geneConceptId = interaction.gene?.conceptId as string | undefined
        allInteractions.push({
          drugName: name,
          geneSymbol: geneName,
          geneName,
          interactionType: (interaction.interactionTypes || []).map((t: { type: string }) => t.type).filter(Boolean).join(', '),
          evidence: (interaction.sources || []).map((s: { sourceDbName: string }) => s.sourceDbName).filter(Boolean).join(', '),
          source: (interaction.sources || []).map((s: { sourceDbName: string }) => s.sourceDbName).filter(Boolean).join(', '),
          score: 0,
          url: dgidbGeneDeepLink(geneConceptId, geneName),
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