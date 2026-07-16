import { NextRequest, NextResponse } from 'next/server'
import { getOrphanetGenes, searchOrphanetDiseases } from '@/lib/api/orphanet'

/**
 * GET /api/orphanet/genes?q=disease+name  OR  ?orphaCode=12345
 * Free Orphadata API — rare-disease gene associations for pin bias.
 */
export async function GET(request: NextRequest) {
  const orphaCode = request.nextUrl.searchParams.get('orphaCode')?.trim()
  const q = request.nextUrl.searchParams.get('q')?.trim()

  try {
    if (orphaCode) {
      const genes = await getOrphanetGenes(orphaCode)
      return NextResponse.json({ orphaCode, genes })
    }
    if (q && q.length >= 2) {
      const hits = await searchOrphanetDiseases(q)
      const top = hits[0]
      if (!top?.orphaCode) {
        return NextResponse.json({ genes: [], orphaCode: null })
      }
      const genes = await getOrphanetGenes(top.orphaCode)
      return NextResponse.json({
        orphaCode: top.orphaCode,
        diseaseName: top.diseaseName,
        genes,
      })
    }
    return NextResponse.json(
      { error: 'Provide q (disease name) or orphaCode' },
      { status: 400 },
    )
  } catch (err) {
    return NextResponse.json(
      { genes: [], error: err instanceof Error ? err.message : 'Orphanet failed' },
      { status: 200 },
    )
  }
}
