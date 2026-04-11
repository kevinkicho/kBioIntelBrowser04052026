import { NextResponse } from 'next/server'
import { getIEDBData } from '@/lib/api/iedb'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch epitope data from IEDB
    const data = await getIEDBData(moleculeId)

    return NextResponse.json({
      epitopes: data.epitopes
    })
  } catch (error) {
    console.error('IEDB API error:', error)
    return NextResponse.json({ error: 'Failed to fetch IEDB data' }, { status: 500 })
  }
}