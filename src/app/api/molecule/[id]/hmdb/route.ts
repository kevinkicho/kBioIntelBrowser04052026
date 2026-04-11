import { NextResponse } from 'next/server'
import { getHMDBData } from '@/lib/api/hmdb'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch metabolite data from HMDB
    const data = await getHMDBData(moleculeId)

    return NextResponse.json({
      metabolites: data.metabolites
    })
  } catch (error) {
    console.error('HMDB API error:', error)
    return NextResponse.json({ error: 'Failed to fetch HMDB data' }, { status: 500 })
  }
}