import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getDrugsByIngredient } from '@/lib/api/openfda'

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
    return NextResponse.json({ companies: [] })
  }

  // Try the molecule name and first synonym for best coverage
  const searchTerms = [molecule.name, ...molecule.synonyms.slice(0, 2)]
  const resultsPerTerm = await Promise.all(
    searchTerms.map(term => getDrugsByIngredient(term))
  )

  // Merge and deduplicate by brandName
  const seen = new Set<string>()
  const companies = resultsPerTerm.flat().filter(p => {
    if (seen.has(p.brandName)) return false
    seen.add(p.brandName)
    return true
  })

  return NextResponse.json({ companies })
}
