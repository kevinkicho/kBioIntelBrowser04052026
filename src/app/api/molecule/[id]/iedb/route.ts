import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getIEDBData } from '@/lib/api/iedb'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cid = parseInt(params.id, 10)
    if (isNaN(cid)) {
      return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
    }

    const molecule = await getMoleculeById(cid)
    if (!molecule) {
      return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
    }

    // IEDB is antigen/protein-oriented — use target protein names / genes
    const resolved = await resolveDrugTargets(molecule.name, 5)
    const queries = [
      ...resolved.targetNames,
      ...resolved.geneSymbols,
      molecule.name,
    ].filter(Boolean)

    const allEpitopes = []
    const seen = new Set<number>()
    for (const q of queries.slice(0, 4)) {
      const data = await getIEDBData(q)
      for (const e of data.epitopes ?? []) {
        if (seen.has(e.epitopeId)) continue
        seen.add(e.epitopeId)
        allEpitopes.push(e)
      }
      if (allEpitopes.length >= 10) break
    }

    return NextResponse.json({ epitopes: allEpitopes.slice(0, 25) })
  } catch (error) {
    console.error('IEDB API error:', error)
    return NextResponse.json({ error: 'Failed to fetch IEDB data' }, { status: 500 })
  }
}
