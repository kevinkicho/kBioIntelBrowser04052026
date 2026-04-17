import { NextRequest, NextResponse } from 'next/server'
import { getSimilarMolecules } from '@/lib/api/pubchem-similar'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
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

  const [moleculeName, structural] = await Promise.all([
    resolveMoleculeName(cid),
    getSimilarMolecules(cid),
  ])

  let targetRelated: Awaited<ReturnType<typeof getTargetRelatedMolecules>> = []

  if (moleculeName) {
    const { getDrugGeneInteractionsByName } = await import('@/lib/api/dgidb')
    const geneInteractions = await getDrugGeneInteractionsByName(moleculeName)
    const geneSymbols = geneInteractions.map(i => i.geneSymbol).filter(Boolean)
    if (geneSymbols.length > 0) {
      targetRelated = await getTargetRelatedMolecules(geneSymbols, moleculeName)
    }
  }

  const result = { structural, targetRelated }
  setCache(cacheKey, result)
  return NextResponse.json(result)
}

async function resolveMoleculeName(cid: number): Promise<string | null> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title/JSON`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.PropertyTable?.Properties?.[0]?.Title ?? null
  } catch {
    return null
  }
}