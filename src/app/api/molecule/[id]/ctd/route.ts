import { NextResponse } from 'next/server'
import { getCTDData } from '@/lib/api/ctd'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch chemical-gene-disease interactions from CTD
    const data = await getCTDData(moleculeId, false)

    return NextResponse.json({
      interactions: data.interactions,
      diseaseAssociations: data.diseaseAssociations
    })
  } catch (error) {
    console.error('CTD API error:', error)
    return NextResponse.json({ error: 'Failed to fetch CTD data' }, { status: 500 })
  }
}