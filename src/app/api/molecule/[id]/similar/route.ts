import { NextRequest, NextResponse } from 'next/server'
import { getSimilarMolecules } from '@/lib/api/pubchem-similar'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'
import { getCached, setCache } from '@/lib/cache'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const cacheKey = `similar:${cid}`
  const cached = getCached<unknown>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const [structural, geneInteractions] = await Promise.all([
    getSimilarMolecules(cid),
    getDrugGeneInteractionsByCID(cid),
  ])

  const geneSymbols = geneInteractions.map(i => i.geneSymbol).filter(Boolean)
  const drugName = geneInteractions[0]?.drugName ?? ''
  const targetRelated = geneSymbols.length > 0
    ? await getTargetRelatedMolecules(geneSymbols, drugName)
    : []

  const result = { structural, targetRelated }
  setCache(cacheKey, result)
  return NextResponse.json(result)
}

async function getDrugGeneInteractionsByCID(cid: number) {
  try {
    const nameUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title/JSON`
    const nameRes = await fetch(nameUrl, { next: { revalidate: 86400 } })
    if (!nameRes.ok) return []
    const nameData = await nameRes.json()
    const name = nameData.PropertyTable?.Properties?.[0]?.Title
    if (!name) return []
    return getDrugGeneInteractionsByName(name)
  } catch {
    return []
  }
}