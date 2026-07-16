import {
  DISABLED_API_SOURCES,
  isApiSourceDisabled,
  getApiSourceDisabledReason,
} from '@/lib/api/sourceAvailability'

describe('sourceAvailability', () => {
  test('disables known-broken and stub sources', () => {
    expect(isApiSourceDisabled('nci-cadsr')).toBe(true)
    expect(isApiSourceDisabled('niaid-immport')).toBe(true)
    expect(isApiSourceDisabled('ttd')).toBe(true)
    expect(getApiSourceDisabledReason('nci-cadsr')).toMatch(/cadsrapi/)
    expect(getApiSourceDisabledReason('ttd')).toMatch(/REST/)
  })

  test('leaves other sources enabled', () => {
    expect(isApiSourceDisabled('pubchem')).toBe(false)
    expect(isApiSourceDisabled('chembl')).toBe(false)
    expect(getApiSourceDisabledReason('pubchem')).toBeUndefined()
  })

  test('DISABLED_API_SOURCES includes stubs', () => {
    expect(Object.keys(DISABLED_API_SOURCES)).toEqual(
      expect.arrayContaining(['nci-cadsr', 'niaid-immport', 'ttd', 'dfdb', 'phytohub']),
    )
  })
})
