import {
  buildCharacterizationChips,
  CHARACTERIZATION_CHIP_CATALOG,
  pcddbSearchUrl,
  pdbeSecondaryStructureUrl,
  prideSearchUrl,
} from '@/lib/pdbCharacterization'

describe('pdbCharacterization', () => {
  it('catalog covers CIF, CD, MS, SPR, ITC, DSC, UV, SS', () => {
    const ids = CHARACTERIZATION_CHIP_CATALOG.map((c) => c.id)
    expect(ids).toEqual(
      expect.arrayContaining(['cif', 'ss', 'cd', 'ms', 'spr', 'itc', 'dsc', 'uv']),
    )
  })

  it('CIF and SS are available for a real PDB id', () => {
    const chips = buildCharacterizationChips({
      pdbId: '1M17',
      title: 'EGFR kinase',
    })
    const cif = chips.find((c) => c.id === 'cif')!
    const ss = chips.find((c) => c.id === 'ss')!
    expect(cif.availability).toBe('available')
    expect(cif.href).toContain('1M17.cif')
    expect(ss.availability).toBe('available')
    expect(ss.href).toContain('pdbe')
    expect(ss.href).toContain('secondary')
  })

  it('CD explores PCDDB; MS explores PRIDE; SPR/ITC/DSC/UV are empty placeholders', () => {
    const chips = buildCharacterizationChips({
      pdbId: '1M17',
      title: 'EGFR',
    })
    expect(chips.find((c) => c.id === 'cd')!.availability).toBe('explore')
    expect(chips.find((c) => c.id === 'cd')!.href).toContain('pcddb')
    expect(chips.find((c) => c.id === 'ms')!.availability).toBe('explore')
    expect(chips.find((c) => c.id === 'ms')!.href).toContain('pride')
    for (const id of ['spr', 'itc', 'dsc', 'uv'] as const) {
      const c = chips.find((x) => x.id === id)!
      expect(c.availability).toBe('empty')
      expect(c.href).toContain('pubmed')
    }
  })

  it('probe hits upgrade CD and MS to available', () => {
    const chips = buildCharacterizationChips({
      pdbId: '1M17',
      title: 'EGFR',
      probe: {
        cd: { hit: true, href: 'https://pcddb.cryst.bbk.ac.uk/search?search=1M17' },
        ms: {
          hit: true,
          href: 'https://www.ebi.ac.uk/pride/archive/projects/PXD000001',
          accession: 'PXD000001',
        },
      },
    })
    expect(chips.find((c) => c.id === 'cd')!.availability).toBe('available')
    expect(chips.find((c) => c.id === 'ms')!.availability).toBe('available')
    expect(chips.find((c) => c.id === 'ms')!.href).toContain('PXD000001')
  })


  it('helper URLs are free public hosts', () => {
    expect(pcddbSearchUrl('1M17')).toContain('pcddb.cryst.bbk.ac.uk')
    expect(prideSearchUrl('EGFR')).toContain('ebi.ac.uk/pride')
    expect(pdbeSecondaryStructureUrl('1m17')).toContain('pdbe')
  })
})
