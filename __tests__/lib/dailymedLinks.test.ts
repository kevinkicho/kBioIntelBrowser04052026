import {
  dailyMedLabelUrl,
  dailyMedRowDeepLink,
  extractDailyMedSetId,
  isStableDailyMedDeepLink,
  normalizeDailyMedSetId,
} from '@/lib/dailymedLinks'

describe('dailymedLinks', () => {
  it('normalizes setid UUID', () => {
    expect(normalizeDailyMedSetId('58941782-362d-4436-b365-e909bdbd29a2')).toBe(
      '58941782-362d-4436-b365-e909bdbd29a2',
    )
    expect(normalizeDailyMedSetId('{58941782-362D-4436-B365-E909BDBD29A2}')).toBe(
      '58941782-362d-4436-b365-e909bdbd29a2',
    )
    expect(normalizeDailyMedSetId('')).toBeNull()
  })

  it('builds drugInfo.cfm deep link', () => {
    expect(dailyMedLabelUrl('58941782-362d-4436-b365-e909bdbd29a2')).toBe(
      'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=58941782-362d-4436-b365-e909bdbd29a2',
    )
  })

  it('rejects empty setid URLs as unstable', () => {
    expect(
      isStableDailyMedDeepLink(
        'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=',
      ),
    ).toBe(false)
    expect(isStableDailyMedDeepLink('https://dailymed.nlm.nih.gov/dailymed/')).toBe(false)
  })

  it('row deep link prefers setid over broken stored url', () => {
    const href = dailyMedRowDeepLink({
      setId: '58941782-362d-4436-b365-e909bdbd29a2',
      dailyMedUrl: 'https://dailymed.nlm.nih.gov/dailymed/index.cfm',
      title: 'ASPIRIN TABLET',
    })
    expect(href).toContain('drugInfo.cfm?setid=58941782-362d-4436-b365-e909bdbd29a2')
  })

  it('row recovers setid from stored url', () => {
    const href = dailyMedRowDeepLink({
      dailyMedUrl:
        'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8ae16aa2-54bc-4c1a-aa36-93524199a67b',
    })
    expect(extractDailyMedSetId(href)).toBe('8ae16aa2-54bc-4c1a-aa36-93524199a67b')
  })

  it('falls back to search when no setid', () => {
    const href = dailyMedRowDeepLink({ title: 'METFORMIN HYDROCHLORIDE' })
    expect(href).toContain('search.cfm')
    expect(href).toContain('METFORMIN')
  })
})
