import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const molecule = await getMoleculeById(cid)
  if (!molecule) {
    return NextResponse.json({ gwasAssociations: [] })
  }

  const gwasAssociations = await getGwasAssociationsByName(molecule.name)
  return NextResponse.json({ gwasAssociations })
}
