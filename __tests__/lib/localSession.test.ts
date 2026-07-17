/**
 * @jest-environment jsdom
 */
import {
  createLocalSession,
  initialsFromName,
  readLocalSession,
  writeLocalSession,
  endLocalSession,
  LOCAL_SESSION_KEY,
} from '@/lib/localSession'

beforeEach(() => {
  localStorage.clear()
})

describe('localSession', () => {
  test('createLocalSession has id and default name', () => {
    const s = createLocalSession()
    expect(s.sessionId).toMatch(/^loc_/)
    expect(s.displayName).toBe('Local researcher')
  })

  test('readLocalSession persists to localStorage', () => {
    const a = readLocalSession()
    const b = readLocalSession()
    expect(a.sessionId).toBe(b.sessionId)
    expect(localStorage.getItem(LOCAL_SESSION_KEY)).toBeTruthy()
  })

  test('writeLocalSession renames', () => {
    readLocalSession()
    const next = writeLocalSession({ displayName: '  Lab Bench  ' })
    expect(next.displayName).toBe('Lab Bench')
    expect(readLocalSession().displayName).toBe('Lab Bench')
  })

  test('initialsFromName', () => {
    expect(initialsFromName('Local researcher')).toBe('LR')
    expect(initialsFromName('Ada')).toBe('AD')
    expect(initialsFromName('  ')).toBe('LR')
  })

  test('endLocalSession creates new identity', async () => {
    const before = readLocalSession()
    writeLocalSession({ displayName: 'Before' })
    const after = await endLocalSession({
      clearSearchHistory: true,
      clearProfileCache: true,
      clearProductEvents: true,
      clearDiscoverRankCache: true,
    })
    expect(after.sessionId).not.toBe(before.sessionId)
    expect(after.displayName).toBe('Local researcher')
  })
})
