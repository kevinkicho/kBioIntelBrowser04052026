import { isEvidencePack } from '@/lib/evidence/pack'
import {
  PACK_IDB_LRU_MAX,
  putPackInCache,
  getPackFromCache,
  deletePackFromCache,
} from '@/lib/project/packCache'

describe('packCache', () => {
  it('exports LRU cap of 20', () => {
    expect(PACK_IDB_LRU_MAX).toBe(20)
  })

  it('putPackInCache rejects invalid pack without throwing', async () => {
    await expect(putPackInCache({} as never)).resolves.toBe(false)
    await expect(putPackInCache(null as never)).resolves.toBe(false)
  })

  it('getPackFromCache returns null for empty id', async () => {
    await expect(getPackFromCache('')).resolves.toBeNull()
  })

  it('deletePackFromCache is safe when IDB unavailable', async () => {
    await expect(deletePackFromCache('pack_x')).resolves.toBeUndefined()
  })

  it('isEvidencePack guard is used by cache writers', () => {
    // Sanity: a minimal non-pack object is rejected by the same guard putPackInCache uses
    expect(isEvidencePack({ id: 'x' })).toBe(false)
  })
})
