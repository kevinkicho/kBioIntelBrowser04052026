import { NextResponse } from 'next/server'
import { getBgeeData } from '@/lib/api/bgee'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch gene expression data from Bgee
    const data = await getBgeeData(moleculeId)

    return NextResponse.json({
      expressions: data.expressions
    })
  } catch (error) {
    console.error('Bgee API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Bgee data' }, { status: 500 })
  }
}