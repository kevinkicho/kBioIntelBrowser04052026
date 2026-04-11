import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getGeneExpressionBySymbols } from '@/lib/api/expression-atlas'

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
    return NextResponse.json({ geneExpressions: [] })
  }

  const uniprotEntries = await getUniprotEntriesByName(molecule.name)
  const geneExpressions = await getGeneExpressionBySymbols(
    uniprotEntries.map(e => e.geneName).filter(Boolean),
  )
  return NextResponse.json({ geneExpressions })
}
