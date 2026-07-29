import { NextRequest, NextResponse } from 'next/server'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { getMoleculeById } from '@/lib/api/pubchem'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  let name: string | undefined
  try {
    const mol = await getMoleculeById(cid)
    name = mol?.name
  } catch {
    /* optional */
  }

  const properties = await getComputedPropertiesByCid(cid, { name })
  return NextResponse.json({ properties })
}
