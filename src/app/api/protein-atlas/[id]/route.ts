import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'

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
    return NextResponse.json({ proteinAtlasEntries: [] })
  }

  const uniprotEntries = await getUniprotEntriesByName(molecule.name)
  const geneNames = uniprotEntries.map(e => e.geneName).filter(Boolean)
  const proteinAtlasEntries = await getProteinAtlasBySymbols(geneNames)
  return NextResponse.json({ proteinAtlasEntries })
}
