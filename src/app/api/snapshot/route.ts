import { NextRequest, NextResponse } from 'next/server'
import { saveSnapshot, type SnapshotEntity } from '@/lib/snapshot/store'

const VALID_TYPES = new Set(['molecule', 'gene', 'disease'])

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
  }
  const { entity, data } = body as { entity?: SnapshotEntity; data?: Record<string, unknown> }

  if (!entity || !VALID_TYPES.has(entity.type)) {
    return NextResponse.json({ error: 'entity.type must be molecule, gene, or disease' }, { status: 400 })
  }
  if (entity.id === undefined || entity.id === null) {
    return NextResponse.json({ error: 'entity.id is required' }, { status: 400 })
  }
  if (!entity.name || typeof entity.name !== 'string') {
    return NextResponse.json({ error: 'entity.name is required' }, { status: 400 })
  }
  if (!data || typeof data !== 'object') {
    return NextResponse.json({ error: 'data must be an object' }, { status: 400 })
  }

  // Cap payload size at ~10MB so a runaway client can't fill the disk.
  const payloadBytes = JSON.stringify(data).length
  if (payloadBytes > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Snapshot payload too large (>10MB)' }, { status: 413 })
  }

  const snap = saveSnapshot(entity, data)
  return NextResponse.json({
    id: snap.id,
    createdAt: snap.createdAt,
    expiresAt: snap.expiresAt,
  })
}
