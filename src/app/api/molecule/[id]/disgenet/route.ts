import { NextResponse } from 'next/server'
import { getDisGeNetData } from '@/lib/api/disgenet'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch gene-disease associations from DisGeNET
    const data = await getDisGeNetData(moleculeId)

    return NextResponse.json({
      associations: data.associations
    })
  } catch (error) {
    console.error('DisGeNET API error:', error)
    return NextResponse.json({ error: 'Failed to fetch DisGeNET data' }, { status: 500 })
  }
}