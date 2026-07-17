import {
  DISCOVER_SESSIONS_KEY,
  MAX_DISCOVER_SESSIONS,
  deleteDiscoverSession,
  listDiscoverSessions,
  saveDiscoverSession,
} from '@/lib/discovery/discoverSessions'

describe('discoverSessions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and lists newest first', () => {
    saveDiscoverSession({ label: 'A', q: 'disease a', diseaseId: null, targets: [] })
    saveDiscoverSession({ label: 'B', q: 'disease b', diseaseId: 'EFO_1', targets: ['MEFV'] })
    const list = listDiscoverSessions()
    expect(list).toHaveLength(2)
    expect(list[0].label).toBe('B')
    expect(list[1].label).toBe('A')
    expect(list[0].targets).toEqual(['MEFV'])
  })

  it('caps at MAX_DISCOVER_SESSIONS', () => {
    for (let i = 0; i < MAX_DISCOVER_SESSIONS + 5; i++) {
      saveDiscoverSession({ label: `S${i}`, q: `q${i}`, diseaseId: null, targets: [] })
    }
    expect(listDiscoverSessions()).toHaveLength(MAX_DISCOVER_SESSIONS)
  })

  it('deletes by id', () => {
    const s = saveDiscoverSession({ label: 'X', q: 'x', diseaseId: null, targets: [] })
    deleteDiscoverSession(s.id)
    expect(listDiscoverSessions()).toHaveLength(0)
    expect(localStorage.getItem(DISCOVER_SESSIONS_KEY)).toBe('[]')
  })
})
