import { NextRequest, NextResponse } from 'next/server'
import { searchByType } from '@/lib/api/pubchem'
import type { SearchType } from '@/lib/apiIdentifiers'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const type = (request.nextUrl.searchParams.get('type') ?? 'name') as SearchType

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const suggestions = await searchByType(q.trim(), type)
  return NextResponse.json({ suggestions })
}