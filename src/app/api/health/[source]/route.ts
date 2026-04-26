import { NextRequest, NextResponse } from 'next/server'
import { healthFor } from '@/lib/analytics/health'

export async function GET(
  _request: NextRequest,
  { params }: { params: { source: string } },
) {
  const source = params.source
  if (!source || source.length > 100) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }
  const assessment = healthFor(source)
  return NextResponse.json(assessment)
}
