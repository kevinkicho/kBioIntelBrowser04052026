import { NextResponse } from 'next/server'
import { getOMIMData } from '@/lib/api/omim'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch genetic disorder data from OMIM
    const data = await getOMIMData(moleculeId)

    return NextResponse.json({
      entries: data.entries
    })
  } catch (error) {
    console.error('OMIM API error:', error)
    return NextResponse.json({ error: 'Failed to fetch OMIM data' }, { status: 500 })
  }
}