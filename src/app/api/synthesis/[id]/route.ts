import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getKeggCompoundId, getKeggReactions, getKeggReactionDetail } from '@/lib/api/kegg'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
import type { SynthesisRoute } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const molecule = await getMoleculeById(cid)
  const name = molecule?.name ?? String(cid)

  const [keggId, rheaRoutes] = await Promise.all([
    getKeggCompoundId(name),
    getRheaSynthesisRoutes(name),
  ])

  const keggRoutes: SynthesisRoute[] = []
  if (keggId) {
    const reactionIds = await getKeggReactions(keggId)
    const details = await Promise.all(reactionIds.slice(0, 5).map(getKeggReactionDetail))
    for (const detail of details) {
      if (!detail) continue
      keggRoutes.push({
        method: detail.name,
        description: detail.equation,
        keggReactionIds: [detail.id],
        enzymesInvolved: detail.enzymes,
        precursors: [],
        source: 'kegg',
      })
    }
  }

  return NextResponse.json({ routes: [...keggRoutes, ...rheaRoutes] })
}
