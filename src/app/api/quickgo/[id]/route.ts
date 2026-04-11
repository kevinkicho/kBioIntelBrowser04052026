import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'

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
    return NextResponse.json({ goAnnotations: [] })
  }

  const uniprotEntries = await getUniprotEntriesByName(molecule.name)
  const accessions = uniprotEntries.map(e => e.accession).filter(Boolean)
  const goAnnotations = await getGoAnnotationsByAccessions(accessions)
  return NextResponse.json({ goAnnotations })
}
