import { NextResponse } from 'next/server'
import { getMyGeneData } from '@/lib/api/mygene'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moleculeId = params.id

    // Fetch gene annotations from MyGene.info
    const data = await getMyGeneData(moleculeId)

    return NextResponse.json({
      genes: data.genes
    })
  } catch (error) {
    console.error('MyGene API error:', error)
    return NextResponse.json({ error: 'Failed to fetch MyGene data' }, { status: 500 })
  }
}