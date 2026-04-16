import { NextRequest, NextResponse } from 'next/server'
import { searchByType } from '@/lib/api/pubchem'
import { searchDiseases as searchOpenTargetsDiseases } from '@/lib/api/opentargets'
import { searchOrphanetDiseases } from '@/lib/api/orphanet'
import { getGenesByDisease } from '@/lib/api/disgenet'
import type { SearchType } from '@/lib/apiIdentifiers'

const VALID_SEARCH_TYPES = new Set<string>(['name', 'cid', 'cas', 'smiles', 'inchikey', 'inchi', 'formula', 'disease'])

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const typeParam = request.nextUrl.searchParams.get('type') ?? 'name'

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  if (!VALID_SEARCH_TYPES.has(typeParam)) {
    return NextResponse.json({ error: `Invalid search type: ${typeParam}. Valid types: name, cid, cas, smiles, inchikey, inchi, formula, disease` }, { status: 400 })
  }

  const query = q.trim()

  try {
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

    const suggestions = await searchByType(query, typeParam as SearchType)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[api/search] Error:', error)
    return NextResponse.json({ error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}