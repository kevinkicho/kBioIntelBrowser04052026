import {
  DISABLED_API_SOURCES,
  isApiSourceDisabled,
  getApiSourceDisabledReason,
  isPanelSourceDisabled,
} from '@/lib/api/sourceAvailability'

describe('sourceAvailability', () => {
  test('all previously blocked sources are enabled', () => {
    expect(isApiSourceDisabled('nci-cadsr')).toBe(false)
    expect(isApiSourceDisabled('niaid-immport')).toBe(false)
    expect(isApiSourceDisabled('ttd')).toBe(false)
    expect(isApiSourceDisabled('dfdb')).toBe(false)
    expect(isApiSourceDisabled('phytohub')).toBe(false)
    expect(getApiSourceDisabledReason('nci-cadsr')).toBeUndefined()
    expect(getApiSourceDisabledReason('ttd')).toBeUndefined()
  })

  test('leaves other sources enabled', () => {
    expect(isApiSourceDisabled('pubchem')).toBe(false)
    expect(isApiSourceDisabled('chembl')).toBe(false)
    expect(getApiSourceDisabledReason('pubchem')).toBeUndefined()
  })

  test('DISABLED_API_SOURCES is empty after free-path enablement', () => {
    expect(Object.keys(DISABLED_API_SOURCES)).toHaveLength(0)
  })

  test('panel helpers match source enablement', () => {
    expect(isPanelSourceDisabled('nci-cadsr')).toBe(false)
    expect(isPanelSourceDisabled('niaid-immport')).toBe(false)
    expect(isPanelSourceDisabled('ttd')).toBe(false)
  })
})
