import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getPeptideAtlasData, getPeptidesByProtein } from '@/lib/api/peptideatlas'
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

    const resolved = await resolveDrugTargets(molecule.name, 5)
    const peptides = []
    const seen = new Set<string>()

    for (const acc of resolved.uniprotAccessions.slice(0, 3)) {
      const rows = await getPeptidesByProtein(acc)
      for (const p of rows) {
        const key = p.peptideId || p.sequence
        if (seen.has(key)) continue
        seen.add(key)
        peptides.push(p)
      }
      if (peptides.length >= 10) break
    }

    if (peptides.length === 0) {
      for (const gene of resolved.geneSymbols.slice(0, 3)) {
        const data = await getPeptideAtlasData(gene)
        for (const p of data.peptides ?? []) {
          const key = p.peptideId || p.sequence
          if (seen.has(key)) continue
          seen.add(key)
          peptides.push(p)
        }
        if (peptides.length >= 10) break
      }
    }

    if (peptides.length === 0) {
      const data = await getPeptideAtlasData(molecule.name)
      peptides.push(...(data.peptides ?? []))
    }

    return NextResponse.json({ peptides: peptides.slice(0, 20) })
  } catch (error) {
    console.error('PeptideAtlas API error:', error)
    return NextResponse.json({ error: 'Failed to fetch PeptideAtlas data' }, { status: 500 })
  }
}
