import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getProteinDomains } from '@/lib/api/interpro'

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
    return NextResponse.json({ proteinDomains: [] })
  }

  const uniprotEntries = await getUniprotEntriesByName(molecule.name)
  const proteinDomains = await getProteinDomains(
    uniprotEntries.map(e => e.accession).filter(Boolean),
  )
  return NextResponse.json({ proteinDomains })
}
