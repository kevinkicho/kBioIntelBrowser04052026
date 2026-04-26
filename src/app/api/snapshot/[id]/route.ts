import { NextRequest, NextResponse } from 'next/server'
import { loadSnapshot } from '@/lib/snapshot/store'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const snap = loadSnapshot(params.id)
  if (!snap) {
    return NextResponse.json(
      { error: 'Snapshot not found or expired (snapshots have a 30-day TTL)' },
      { status: 404 },
    )
  }
  return NextResponse.json(snap)
}
