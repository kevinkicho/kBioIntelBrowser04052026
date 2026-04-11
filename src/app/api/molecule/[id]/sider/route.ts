import { NextResponse } from 'next/server'
import { getSIDERData } from '@/lib/api/sider'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch side effect data from SIDER
    const data = await getSIDERData(moleculeId)

    return NextResponse.json({
      sideEffects: data.sideEffects
    })
  } catch (error) {
    console.error('SIDER API error:', error)
    return NextResponse.json({ error: 'Failed to fetch SIDER data' }, { status: 500 })
  }
}