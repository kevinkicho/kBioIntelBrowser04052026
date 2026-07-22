import {
  euCtisSearchUrl,
  eudraCtRegisterUrl,
  isEudraCtNumber,
  parseSecondaryTrialIds,
} from '@/lib/euClinicalTrials'

describe('euClinicalTrials', () => {
  it('detects EudraCT numbers', () => {
    expect(isEudraCtNumber('2019-001458-24')).toBe(true)
    expect(isEudraCtNumber('NCT03997383')).toBe(false)
  })

  it('builds EU register search URL', () => {
    expect(eudraCtRegisterUrl('2019-001458-24')).toMatch(
      /clinicaltrialsregister\.eu.*2019-001458-24/,
    )
  })

  it('builds CTIS public search URL', () => {
    const url = euCtisSearchUrl('2019-001458-24')
    expect(url).toContain('euclinicaltrials.eu/ctis-public/search')
    expect(url).toContain(encodeURIComponent('2019-001458-24'))
  })

  it('parses secondary IDs from CTG', () => {
    const { eudraCtNumbers, other } = parseSecondaryTrialIds([
      { id: '2019-001458-24', type: 'EUDRACT_NUMBER' },
      { id: 'ALN-TTR02-011', type: 'OTHER' },
    ])
    expect(eudraCtNumbers).toEqual(['2019-001458-24'])
    expect(other[0].id).toBe('ALN-TTR02-011')
  })
})
