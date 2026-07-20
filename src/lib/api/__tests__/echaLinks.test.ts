import {
  buildEchaDeepLinks,
  echaCasSearchUrl,
  echaChemSearchUrl,
  normalizeCasNumber,
} from '@/lib/echaLinks'

describe('echaLinks', () => {
  it('normalizes CAS numbers', () => {
    expect(normalizeCasNumber('50-00-0')).toBe('50-00-0')
    expect(normalizeCasNumber('  7732-18-5 ')).toBe('7732-18-5')
    expect(normalizeCasNumber('')).toBeNull()
  })

  it('builds CAS and CHEM search URLs', () => {
    expect(echaCasSearchUrl('50-00-0')).toMatch(/echa\.europa\.eu/)
    expect(echaCasSearchUrl('50-00-0')).toMatch(/50-00-0/)
    expect(echaChemSearchUrl('aspirin')).toMatch(/chem\.echa\.europa\.eu/)
  })

  it('buildEchaDeepLinks prefers CAS', () => {
    const links = buildEchaDeepLinks({ cas: '50-00-0', name: 'formaldehyde' })
    expect(links.cas).toBe('50-00-0')
    expect(links.casSearchUrl).toMatch(/50-00-0/)
    expect(links.chemSearchUrl).toMatch(/50-00-0/)
  })
})
