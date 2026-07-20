import { buildInternationalRegulatorLinks } from '@/lib/regulatorDeepLinks'

describe('regulatorDeepLinks', () => {
  it('returns empty for blank name', () => {
    expect(buildInternationalRegulatorLinks('')).toEqual([])
  })

  it('includes MHRA, TGA, PMDA, EMA, Health Canada, FDA', () => {
    const links = buildInternationalRegulatorLinks('tafamidis')
    const ids = links.map((l) => l.id)
    expect(ids).toContain('mhra')
    expect(ids).toContain('tga')
    expect(ids).toContain('pmda')
    expect(ids).toContain('ema')
    expect(ids).toContain('health_canada')
    expect(ids).toContain('fda')
    expect(ids).toContain('purple-book')
    expect(ids).toContain('un-comtrade')
    expect(links.find((l) => l.id === 'mhra')?.url).toMatch(/mhra\.gov\.uk|products\.mhra/)
    expect(links.find((l) => l.id === 'tga')?.url).toMatch(/tga\.gov\.au/)
    expect(links.find((l) => l.id === 'ema-download')?.url).toMatch(/download-medicine-data/)
    expect(links.find((l) => l.id === 'purple-book')?.url).toMatch(/purplebooksearch/)
  })
})
