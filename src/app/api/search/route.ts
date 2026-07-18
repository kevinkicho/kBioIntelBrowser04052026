import { NextRequest, NextResponse } from 'next/server'
import { searchByType } from '@/lib/api/pubchem'
import { searchDiseases as searchOpenTargetsDiseases } from '@/lib/api/opentargets'
import { searchOrphanetDiseases } from '@/lib/api/orphanet'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { searchGenes } from '@/lib/api/mygene'
import type { SearchType } from '@/lib/apiIdentifiers'
import {
  filterMoleculeSuggestionLabels,
  isDatabaseIdNoise,
} from '@/lib/search/entityHints'

const VALID_SEARCH_TYPES = new Set<string>([
  'all',
  'name',
  'cid',
  'cas',
  'smiles',
  'inchikey',
  'inchi',
  'formula',
  'disease',
  'gene',
])

export type UnifiedSearchHit = {
  kind: 'disease' | 'molecule' | 'gene'
  label: string
  /** Gene explorer key: `{geneId}-{symbol}` when available */
  geneKey?: string
}

async function searchDiseasesList(query: string, limit = 5): Promise<string[]> {
  const [otResults, orphanetResults, disgenetResults] = await Promise.allSettled([
    searchOpenTargetsDiseases(query),
    searchOrphanetDiseases(query),
    getGenesByDisease(query),
  ])

  const suggestions: string[] = []
  const seen = new Set<string>()

  const otDiseases = otResults.status === 'fulfilled' ? otResults.value : []
  for (const d of otDiseases.slice(0, limit)) {
    const key = d.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      suggestions.push(d.diseaseName)
    }
  }

  const orphanetDiseases = orphanetResults.status === 'fulfilled' ? orphanetResults.value : []
  for (const d of orphanetDiseases.slice(0, limit)) {
    const key = d.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      suggestions.push(d.diseaseName)
    }
  }

  if (disgenetResults.status === 'fulfilled' && disgenetResults.value.length > 0) {
    for (const a of disgenetResults.value.slice(0, limit)) {
      const key = a.diseaseName?.toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        suggestions.push(a.diseaseName)
      }
    }
  }

  return suggestions.slice(0, limit)
}

async function searchMoleculesList(query: string, typeParam: SearchType): Promise<string[]> {
  let suggestions = await searchByType(query, typeParam)

  if (suggestions.length === 0 && (typeParam === 'name' || typeParam === 'cas')) {
    try {
      const { searchChemblMoleculeNames, searchMyChemMoleculeNames } = await import(
        '@/lib/api/cloudSearchFallback'
      )
      const [a, b] = await Promise.all([
        searchChemblMoleculeNames(query, 8),
        searchMyChemMoleculeNames(query, 8),
      ])
      const seen = new Set<string>()
      const merged: string[] = []
      for (const n of [...a, ...b]) {
        const k = n.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        merged.push(n)
        if (merged.length >= 8) break
      }
      suggestions = merged
    } catch {
      /* keep empty */
    }
  }

  return filterMoleculeSuggestionLabels(suggestions)
}

async function searchGenesList(
  query: string,
  limit = 5,
): Promise<Array<{ label: string; geneKey: string }>> {
  // Pathway IDs are not genes — do not fan out mygene for WP1220 etc.
  if (isDatabaseIdNoise(query)) return []
  const genes = await searchGenes(query)
  return genes
    .slice(0, limit)
    .filter((g) => {
      const sym = g.symbol || String(g.geneId)
      return !isDatabaseIdNoise(sym)
    })
    .map((g) => ({
      label: g.symbol || String(g.geneId),
      geneKey: `${g.geneId}-${g.symbol}`,
    }))
}

/** Unified fan-out: disease + molecule + gene in parallel. */
async function searchAll(query: string): Promise<UnifiedSearchHit[]> {
  const [diseases, molecules, genes] = await Promise.all([
    searchDiseasesList(query, 5).catch(() => [] as string[]),
    searchMoleculesList(query, 'name').catch(() => [] as string[]),
    searchGenesList(query, 5).catch(() => [] as Array<{ label: string; geneKey: string }>),
  ])

  const results: UnifiedSearchHit[] = []
  const seen = new Set<string>()

  // Interleave by kind blocks so UI groups cleanly (disease → molecule → gene)
  for (const label of diseases) {
    const k = `d:${label.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    results.push({ kind: 'disease', label })
  }
  for (const label of molecules.slice(0, 6)) {
    const k = `m:${label.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    results.push({ kind: 'molecule', label })
  }
  for (const g of genes) {
    const k = `g:${g.label.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    results.push({ kind: 'gene', label: g.label, geneKey: g.geneKey })
  }

  return results
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  // Default to unified "all" so homepage needs no mode toggle
  const typeParam = request.nextUrl.searchParams.get('type') ?? 'all'

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  if (!VALID_SEARCH_TYPES.has(typeParam)) {
    return NextResponse.json(
      {
        error: `Invalid search type: ${typeParam}. Valid types: all, name, cid, cas, smiles, inchikey, inchi, formula, disease, gene`,
      },
      { status: 400 },
    )
  }

  const query = q.trim()

  try {
    if (typeParam === 'all') {
      const results = await searchAll(query)
      return NextResponse.json({
        searchType: 'all',
        results,
        // Backward-compatible flat labels
        suggestions: results.map((r) => r.label),
        ...(results.length === 0
          ? { warning: 'No disease, molecule, or gene matches' }
          : {}),
      })
    }

    if (typeParam === 'gene') {
      const genes = await searchGenesList(query, 10)
      const results: UnifiedSearchHit[] = genes.map((g) => ({
        kind: 'gene' as const,
        label: g.label,
        geneKey: g.geneKey,
      }))
      return NextResponse.json({
        suggestions: results.map((r) => r.geneKey || r.label),
        results,
        searchType: 'gene',
      })
    }

    if (typeParam === 'disease') {
      const diseases = await searchDiseasesList(query, 10)
      const results: UnifiedSearchHit[] = diseases.map((label) => ({
        kind: 'disease' as const,
        label,
      }))
      return NextResponse.json({
        suggestions: diseases,
        results,
        searchType: 'disease',
      })
    }

    const suggestions = await searchMoleculesList(query, typeParam as SearchType)
    const results: UnifiedSearchHit[] = suggestions.map((label) => ({
      kind: 'molecule' as const,
      label,
    }))
    return NextResponse.json({
      suggestions,
      results,
      searchType: typeParam,
      ...(suggestions.length === 0
        ? { warning: 'No matches from PubChem or cloud fallback sources' }
        : {}),
    })
  } catch (error) {
    console.error('[api/search] Error:', error)
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
