import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getEnsemblGenesBySymbols } from '@/lib/api/ensembl'

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
    return NextResponse.json({ ensemblGenes: [] })
  }

  const uniprotEntries = await getUniprotEntriesByName(molecule.name)
  const ensemblGenes = await getEnsemblGenesBySymbols(
    uniprotEntries.map(e => e.geneName).filter(Boolean),
  )
  return NextResponse.json({ ensemblGenes })
}
