import {
  diffWatchlistDensity,
  formatDensityChanges,
  saveWatchlistDensitySnapshot,
  getWatchlistDensitySnapshot,
  detectAndSaveWatchlistDensityChanges,
} from '@/lib/watchlistDensitySnapshot'
import { emptyWatchlistDensity } from '@/lib/watchlistSummary'

describe('watchlistDensitySnapshot', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('diffs density metrics', () => {
    const prev = { ...emptyWatchlistDensity(), activeTrials: 2, sponsorCount: 1 }
    const cur = { ...emptyWatchlistDensity(), activeTrials: 5, sponsorCount: 1, blaCount: 3 }
    const changes = diffWatchlistDensity(prev, cur)
    expect(changes.some((c) => c.key === 'activeTrials' && c.type === 'up' && c.delta === 3)).toBe(
      true,
    )
    expect(changes.some((c) => c.key === 'blaCount' && c.type === 'up')).toBe(true)
    expect(formatDensityChanges(changes)).toMatch(/trials/)
  })

  it('returns empty when no previous', () => {
    expect(diffWatchlistDensity(null, emptyWatchlistDensity())).toEqual([])
  })

  it('persists snapshot and detects on second visit', () => {
    const cid = 2244
    const first = { ...emptyWatchlistDensity(), activeTrials: 1 }
    const second = { ...emptyWatchlistDensity(), activeTrials: 4, grantCount: 2 }

    const c1 = detectAndSaveWatchlistDensityChanges(cid, first)
    expect(c1).toEqual([])
    const snap = getWatchlistDensitySnapshot(cid)
    expect(snap?.summary.activeTrials).toBe(1)

    const c2 = detectAndSaveWatchlistDensityChanges(cid, second)
    expect(c2.some((c) => c.key === 'activeTrials' && c.delta === 3)).toBe(true)
    expect(c2.some((c) => c.key === 'grantCount')).toBe(true)

    saveWatchlistDensitySnapshot(cid, second)
    expect(getWatchlistDensitySnapshot(cid)?.summary.grantCount).toBe(2)
  })
})
