import path from 'path'
import fs from 'fs'

const TMP_DIR = path.join(process.cwd(), 'data', 'snapshots')

beforeEach(() => {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true })
  jest.resetModules()
})
afterAll(() => {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true })
})

describe('snapshot store', () => {
  test('saves and round-trips a snapshot', async () => {
    const { saveSnapshot, loadSnapshot } = await import('@/lib/snapshot/store')
    const snap = saveSnapshot(
      { type: 'molecule', id: 2244, name: 'Aspirin' },
      { foo: 'bar' },
    )
    expect(snap.id).toMatch(/^[a-f0-9]{32}$/)
    expect(snap.entity.name).toBe('Aspirin')
    const loaded = loadSnapshot(snap.id)
    expect(loaded?.data).toEqual({ foo: 'bar' })
  })

  test('content-addressed: identical input produces identical id', async () => {
    const { saveSnapshot } = await import('@/lib/snapshot/store')
    const a = saveSnapshot({ type: 'gene', id: 'BRCA1', name: 'BRCA1' }, { x: 1 })
    const b = saveSnapshot({ type: 'gene', id: 'BRCA1', name: 'BRCA1' }, { x: 1 })
    expect(a.id).toBe(b.id)
  })

  test('different data produces different ids', async () => {
    const { saveSnapshot } = await import('@/lib/snapshot/store')
    const a = saveSnapshot({ type: 'molecule', id: 1, name: 'A' }, { x: 1 })
    const b = saveSnapshot({ type: 'molecule', id: 1, name: 'A' }, { x: 2 })
    expect(a.id).not.toBe(b.id)
  })

  test('returns null for malformed id', async () => {
    const { loadSnapshot } = await import('@/lib/snapshot/store')
    expect(loadSnapshot('not-a-hex')).toBeNull()
    expect(loadSnapshot('')).toBeNull()
  })

  test('returns null for missing snapshot', async () => {
    const { loadSnapshot } = await import('@/lib/snapshot/store')
    expect(loadSnapshot('a'.repeat(32))).toBeNull()
  })

  test('expired snapshot returns null and deletes the file', async () => {
    const { saveSnapshot, loadSnapshot } = await import('@/lib/snapshot/store')
    const snap = saveSnapshot({ type: 'molecule', id: 1, name: 'A' }, { x: 1 })
    const filePath = path.join(TMP_DIR, `${snap.id}.json`)
    // Manually rewrite the snapshot with an expired date
    const expired = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    expired.expiresAt = new Date(Date.now() - 1000).toISOString()
    fs.writeFileSync(filePath, JSON.stringify(expired))
    expect(loadSnapshot(snap.id)).toBeNull()
    expect(fs.existsSync(filePath)).toBe(false)
  })
})
