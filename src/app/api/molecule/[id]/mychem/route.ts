import { NextResponse } from 'next/server'
import { getMyChemData } from '@/lib/api/mychem'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch chemical annotations from MyChem.info
    const data = await getMyChemData(moleculeId)

    return NextResponse.json({
      chemicals: data.chemicals
    })
  } catch (error) {
    console.error('MyChem API error:', error)
    return NextResponse.json({ error: 'Failed to fetch MyChem data' }, { status: 500 })
  }
}