import { searchDiseases as searchOpenTargetsDiseases, getDrugsForDisease } from '@/lib/api/opentargets'
import { searchOrphanetDiseases, getOrphanetGenes } from '@/lib/api/orphanet'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { getMoleculeCidByName } from '@/lib/api/pubchem'

export interface DiseaseResult {
  id: string
  name: string
  description?: string
  therapeuticAreas?: string[]
  source: string
  molecules?: { name: string; cid: number | null }[]
}

export function rankDiseaseResults(results: DiseaseResult[], query: string): DiseaseResult[] {
  const lower = query.toLowerCase()
  return [...results].sort((a, b) => {
    const aExact = a.name.toLowerCase() === lower ? 2 : a.name.toLowerCase().startsWith(lower) ? 1 : 0
    const bExact = b.name.toLowerCase() === lower ? 2 : b.name.toLowerCase().startsWith(lower) ? 1 : 0
    return bExact - aExact
  })
}

function parseLimit(limitParam: string | null): number {
  return Math.min(Math.max(parseInt(limitParam ?? '10', 10) || 10, 1), 25)
}

export { parseLimit }

export async function fetchDisGeNetDiseases(query: string): Promise<{ id: string; name: string }[]> {
  const associations = await getGenesByDisease(query)
  const seen = new Set<string>()
  const diseases: { id: string; name: string }[] = []
  for (const assoc of associations) {
    const key = assoc.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      diseases.push({ id: assoc.diseaseId, name: assoc.diseaseName })
    }
  }
  return diseases
}

export async function resolveMoleculesFromNames(names: string[]): Promise<{ name: string; cid: number | null }[]> {
  const results = await Promise.allSettled(
    names.slice(0, 10).map(async (name) => {
      try {
        const cid = await getMoleculeCidByName(name)
        return { name, cid }
      } catch {
        return { name, cid: null }
      }
    })
  )
  const out: { name: string; cid: number | null }[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out.push(r.value)
    }
  }
  return out
}

export async function resolveMoleculesFromGenes(geneSymbols: string[]): Promise<{ name: string; cid: number | null }[]> {
  const unique = Array.from(new Set(geneSymbols.filter(Boolean)))
  const results = await Promise.allSettled(
    unique.slice(0, 10).map(async (symbol) => {
      try {
        const proteinRes = await fetch(
          `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(symbol)}&fields=accession,protein_name&size=1&format=json`,
          { next: { revalidate: 86400 } }
        )
        if (!proteinRes.ok) return { name: symbol, cid: null }
        const data = await proteinRes.json()
        const proteinName: string = data?.results?.[0]?.proteinDescription?.recommendedName?.fullName?.value ?? symbol
        const cid = await getMoleculeCidByName(proteinName)
        return { name: proteinName, cid }
      } catch {
        return { name: symbol, cid: null }
      }
    })
  )
  const out: { name: string; cid: number | null }[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out.push(r.value)
    }
  }
  return out
}

export async function searchDiseases(query: string, limit: number): Promise<DiseaseResult[]> {
  const [otResults, orphanetResults, disgenetResults] = await Promise.allSettled([
    searchOpenTargetsDiseases(query),
    searchOrphanetDiseases(query),
    fetchDisGeNetDiseases(query),
  ])

  if (otResults.status === 'rejected') console.error('[api/search/disease] Open Targets failed:', otResults.reason)
  if (orphanetResults.status === 'rejected') console.error('[api/search/disease] Orphanet failed:', orphanetResults.reason)
  if (disgenetResults.status === 'rejected') console.error('[api/search/disease] DisGeNET failed:', disgenetResults.reason)

  const candidates: DiseaseResult[] = []
  const seen = new Set<string>()

  const otDiseases = otResults.status === 'fulfilled' ? otResults.value : []
  for (const d of otDiseases.slice(0, limit)) {
    const name = d.diseaseName ?? ''
    if (!name) continue
    const key = name.toLowerCase() || d.diseaseId
    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({
        id: d.diseaseId,
        name,
        description: d.description,
        therapeuticAreas: d.therapeuticAreas,
        source: 'Open Targets',
      })
    }
  }

  const orphanetDiseases = orphanetResults.status === 'fulfilled' ? orphanetResults.value : []
  for (const d of orphanetDiseases.slice(0, limit)) {
    const key = d.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      candidates.push({
        id: d.orphaCode,
        name: d.diseaseName,
        description: d.definition,
        source: 'Orphanet',
      })
    }
  }

  if (disgenetResults.status === 'fulfilled' && disgenetResults.value.length > 0) {
    for (const d of disgenetResults.value) {
      const key = d.name?.toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        candidates.push({
          id: d.id,
          name: d.name,
          source: 'DisGeNET',
        })
        if (candidates.length >= limit * 2) break
      }
    }
  }

  const ranked = rankDiseaseResults(candidates, query)

  const topResults = ranked.slice(0, limit)

  const withMolecules = await Promise.all(
    topResults.map(async (r) => {
      try {
        if (r.source === 'Open Targets' && r.id) {
          const targetNames = await getDrugsForDisease(r.id)
          if (targetNames.length > 0) {
            const molecules = await resolveMoleculesFromNames(targetNames)
            if (molecules.length > 0) return { ...r, molecules }
          }
          return r
        }

        if (r.source === 'Orphanet' && r.id) {
          const geneSymbols = await getOrphanetGenes(r.id)
          if (geneSymbols.length > 0) {
            const molecules = await resolveMoleculesFromGenes(geneSymbols)
            if (molecules.length > 0) return { ...r, molecules }
          }
          return r
        }

        if (r.source === 'DisGeNET') {
          const geneAssociations = await getGenesByDisease(r.name)
          const geneSymbols = geneAssociations.map(a => a.geneSymbol).filter(Boolean)
          const molecules = await resolveMoleculesFromGenes(geneSymbols)
          return { ...r, molecules }
        }

        return r
      } catch {
        return r
      }
    })
  )

  return withMolecules
}

export function deduplicateMolecules(results: DiseaseResult[]): { name: string; cid: number | null; sources: string[] }[] {
  const seen = new Map<string, { name: string; cid: number | null; sources: string[] }>()
  for (const r of results) {
    if (!r.molecules) continue
    for (const m of r.molecules) {
      const key = m.cid != null ? `cid:${m.cid}` : `name:${m.name.toLowerCase()}`
      const existing = seen.get(key)
      if (existing) {
        if (!existing.sources.includes(r.source)) {
          existing.sources.push(r.source)
        }
      } else {
        seen.set(key, { name: m.name, cid: m.cid, sources: [r.source] })
      }
    }
  }
  return Array.from(seen.values())
}