/**
 * Pure helpers for migration throttle metadata (no Firebase network).
 */

import { getLastMigrateAt } from '../migrate'

describe('getLastMigrateAt', () => {
  const KEY = 'biointel-firebase-last-migrate-v1'

  beforeEach(() => {
    localStorage.removeItem(KEY)
  })

  it('returns null when never migrated', () => {
    expect(getLastMigrateAt()).toBeNull()
  })

  it('reads last migrate timestamp from localStorage', () => {
    const iso = '2026-04-05T12:00:00.000Z'
    localStorage.setItem(KEY, iso)
    expect(getLastMigrateAt()).toBe(iso)
  })
})
