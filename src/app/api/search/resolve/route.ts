import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeCidByName } from '@/lib/api/pubchem'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const cid = await getMoleculeCidByName(name)
  return NextResponse.json({ cid })
}
