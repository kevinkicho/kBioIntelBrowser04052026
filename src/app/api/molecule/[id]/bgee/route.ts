import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getBgeeData } from '@/lib/api/bgee'
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

    // Bgee is gene expression — resolve drug → target gene symbols first
    const resolved = await resolveDrugTargets(molecule.name, 5)
    const genes =
      resolved.geneSymbols.length > 0
        ? resolved.geneSymbols
        : [molecule.name]

    const allExpressions = []
    for (const gene of genes.slice(0, 3)) {
      const data = await getBgeeData(gene)
      if (data.expressions?.length) {
        allExpressions.push(...data.expressions)
      }
      if (allExpressions.length >= 20) break
    }

    return NextResponse.json({
      expressions: allExpressions.slice(0, 40),
    })
  } catch (error) {
    console.error('Bgee API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Bgee data' }, { status: 500 })
  }
}
