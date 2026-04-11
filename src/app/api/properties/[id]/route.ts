import { NextRequest, NextResponse } from 'next/server'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const properties = await getComputedPropertiesByCid(cid)
  return NextResponse.json({ properties })
}
