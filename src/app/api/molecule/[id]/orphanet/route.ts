import { NextResponse } from 'next/server'
import { getOrphanetData } from '@/lib/api/orphanet'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch rare disease data from Orphanet
    const data = await getOrphanetData(moleculeId)

    return NextResponse.json({
      diseases: data.diseases
    })
  } catch (error) {
    console.error('Orphanet API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Orphanet data' }, { status: 500 })
  }
}