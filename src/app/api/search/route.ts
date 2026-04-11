import { NextRequest, NextResponse } from 'next/server'
import { searchMolecules } from '@/lib/api/pubchem'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const suggestions = await searchMolecules(q.trim())
  return NextResponse.json({ suggestions })
}
