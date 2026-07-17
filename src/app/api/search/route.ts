import { NextRequest, NextResponse } from 'next/server'
import { searchByType } from '@/lib/api/pubchem'
import { searchDiseases as searchOpenTargetsDiseases } from '@/lib/api/opentargets'
import { searchOrphanetDiseases } from '@/lib/api/orphanet'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { searchGenes } from '@/lib/api/mygene'
import type { SearchType } from '@/lib/apiIdentifiers'

const VALID_SEARCH_TYPES = new Set<string>(['name', 'cid', 'cas', 'smiles', 'inchikey', 'inchi', 'formula', 'disease', 'gene'])

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const typeParam = request.nextUrl.searchParams.get('type') ?? 'name'

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  if (!VALID_SEARCH_TYPES.has(typeParam)) {
    return NextResponse.json({ error: `Invalid search type: ${typeParam}. Valid types: name, cid, cas, smiles, inchikey, inchi, formula, disease, gene` }, { status: 400 })
  }

  const query = q.trim()

  try {
    if (typeParam === 'gene') {
      const genes = await searchGenes(query)
      const suggestions = genes.slice(0, 10).map(g => `${g.geneId}-${g.symbol}`)

      return NextResponse.json({ suggestions, searchType: 'gene' })
    }

    if (typeParam === 'disease') {
      const [otResults, orphanetResults, disgenetResults] = await Promise.allSettled([
        searchOpenTargetsDiseases(query),
        searchOrphanetDiseases(query),
        getGenesByDisease(query),
      ])

      const suggestions: string[] = []
      const seen = new Set<string>()

      const otDiseases = otResults.status === 'fulfilled' ? otResults.value : []
      for (const d of otDiseases.slice(0, 5)) {
        const key = d.diseaseName?.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          suggestions.push(d.diseaseName)
        }
      }

      const orphanetDiseases = orphanetResults.status === 'fulfilled' ? orphanetResults.value : []
      for (const d of orphanetDiseases.slice(0, 5)) {
        const key = d.diseaseName?.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          suggestions.push(d.diseaseName)
        }
      }

      if (disgenetResults.status === 'fulfilled' && disgenetResults.value.length > 0) {
        for (const a of disgenetResults.value.slice(0, 5)) {
          const key = a.diseaseName?.toLowerCase()
          if (key && !seen.has(key)) {
            seen.add(key)
            suggestions.push(a.diseaseName)
          }
        }
      }

      return NextResponse.json({ suggestions, searchType: 'disease' })
    }

    let suggestions = await searchByType(query, typeParam as SearchType)

    // If PubChem path is empty (common on App Hosting / GCP 503), fall back explicitly
    if (
      suggestions.length === 0 &&
      (typeParam === 'name' || typeParam === 'cas')
    ) {
      try {
        const { searchChemblMoleculeNames, searchMyChemMoleculeNames } =
          await import('@/lib/api/cloudSearchFallback')
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

    return NextResponse.json({
      suggestions,
      ...(suggestions.length === 0
        ? { warning: 'No matches from PubChem or cloud fallback sources' }
        : {}),
    })
  } catch (error) {
    console.error('[api/search] Error:', error)
    return NextResponse.json({ error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}