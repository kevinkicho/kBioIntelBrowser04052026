import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getOMIMData } from '@/lib/api/omim'
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

    // OMIM is gene/disease-oriented; try target genes then free-text name
    const resolved = await resolveDrugTargets(molecule.name, 4)
    const queries = [
      ...resolved.geneSymbols,
      molecule.name,
    ].filter(Boolean)

    const allEntries = []
    const seen = new Set<number | string>()
    for (const q of queries.slice(0, 4)) {
      const data = await getOMIMData(q)
      for (const e of data.entries ?? []) {
        const key = e.mimNumber || e.name
        if (seen.has(key)) continue
        seen.add(key)
        allEntries.push(e)
      }
      if (allEntries.length >= 5) break
    }

    // Free Monarch / Open Targets fallback when OMIM key missing
    if (allEntries.length === 0) {
      try {
        const { getDiseaseAssociationsByName } = await import('@/lib/api/opentargets')
        const hits = await getDiseaseAssociationsByName(molecule.name)
        for (const h of hits.slice(0, 10)) {
          allEntries.push({
            mimNumber: 0,
            name: h.diseaseName || '',
            prefix: '',
            status: 'Open Targets',
            description: `Score ${Number(h.score) || 0}`,
            geneSymbols: resolved.geneSymbols.slice(0, 5),
            phenotypes: [],
            references: [],
            url: h.diseaseId
              ? `https://platform.opentargets.org/disease/${h.diseaseId}`
              : 'https://platform.opentargets.org/',
          })
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ entries: allEntries.slice(0, 15) })
  } catch (error) {
    console.error('OMIM API error:', error)
    return NextResponse.json({ error: 'Failed to fetch OMIM data' }, { status: 500 })
  }
}
