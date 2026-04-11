import { NextRequest, NextResponse } from 'next/server'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const hazards = await getGhsHazardsByCid(cid)
  return NextResponse.json({ hazards })
}
