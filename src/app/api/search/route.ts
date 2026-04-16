import { NextRequest, NextResponse } from 'next/server'
import { searchByType } from '@/lib/api/pubchem'
import type { SearchType } from '@/lib/apiIdentifiers'

const VALID_SEARCH_TYPES = new Set<string>(['name', 'cid', 'cas', 'smiles', 'inchikey', 'inchi', 'formula'])

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const typeParam = request.nextUrl.searchParams.get('type') ?? 'name'

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  if (!VALID_SEARCH_TYPES.has(typeParam)) {
    return NextResponse.json({ error: `Invalid search type: ${typeParam}. Valid types: name, cid, cas, smiles, inchikey, inchi, formula` }, { status: 400 })
  }

  try {
    const suggestions = await searchByType(q.trim(), typeParam as SearchType)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[api/search] Error:', error)
    return NextResponse.json({ error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}