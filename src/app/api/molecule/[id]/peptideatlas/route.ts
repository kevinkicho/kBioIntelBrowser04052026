import { NextResponse } from 'next/server'
import { getPeptideAtlasData } from '@/lib/api/peptideatlas'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch peptide data from PeptideAtlas
    const data = await getPeptideAtlasData(moleculeId)

    return NextResponse.json({
      peptides: data.peptides
    })
  } catch (error) {
    console.error('PeptideAtlas API error:', error)
    return NextResponse.json({ error: 'Failed to fetch PeptideAtlas data' }, { status: 500 })
  }
}