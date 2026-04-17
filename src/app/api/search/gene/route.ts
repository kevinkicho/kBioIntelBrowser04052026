import { NextRequest, NextResponse } from 'next/server'
import { searchGenes } from '@/lib/api/mygene'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 50)

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const query = q.trim()

  try {
    const genes = await searchGenes(query)
    const results = genes.slice(0, limit).map(g => ({
      geneId: g.geneId,
      symbol: g.symbol,
      name: g.name,
      summary: g.summary?.slice(0, 200) || '',
      chromosome: g.mapLocation || '',
      typeOfGene: g.typeOfGene || '',
      aliases: (g.aliases || []).slice(0, 5),
    }))

    return NextResponse.json({ results, searchType: 'gene' })
  } catch (error) {
    console.error('[api/search/gene] Error:', error)
    return NextResponse.json({ error: 'Gene search failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}