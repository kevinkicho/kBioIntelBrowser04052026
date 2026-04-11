import { buildExportSections, exportToCsv, exportToJson } from '@/lib/exportData'

describe('buildExportSections', () => {
  it('groups props into 8 categories', () => {
    const sections = buildExportSections({
      companies: [{ brandName: 'Test', company: 'Acme' }],
      clinicalTrials: [{ nctId: 'NCT001', phase: 'Phase 2' }],
    })
    expect(sections.length).toBe(8)
  })

  it('filters out panels with no data', () => {
    const sections = buildExportSections({
      companies: [{ brandName: 'Test' }],
      ndcProducts: [],
    })
    const pharma = sections.find(s => s.category === 'Pharmaceutical')!
    expect(pharma.panels.some(p => p.title === 'Companies')).toBe(true)
    expect(pharma.panels.some(p => p.title === 'NDC Products')).toBe(false)
  })

  it('wraps nullable objects in arrays', () => {
    const sections = buildExportSections({
      computedProperties: { xLogP: 1.5, tpsa: 63.6 },
    })
    const molecular = sections.find(s => s.category === 'Molecular & Chemical')!
    const propPanel = molecular.panels.find(p => p.title === 'Computed Properties')
    expect(propPanel).toBeTruthy()
    expect(Array.isArray(propPanel!.data)).toBe(true)
    expect((propPanel!.data as any[]).length).toBe(1)
  })

  it('handles null props gracefully', () => {
    const sections = buildExportSections({
      computedProperties: null,
      ghsHazards: null,
    })
    const molecular = sections.find(s => s.category === 'Molecular & Chemical')!
    expect(molecular.panels.length).toBe(0)
  })
})

describe('exportToCsv', () => {
  it('produces section headers and data rows', () => {
    const sections = [{
      category: 'Test Category',
      panels: [{
        title: 'Test Panel',
        data: [{ name: 'aspirin', value: 100 }, { name: 'ibuprofen', value: 200 }]
      }]
    }]
    const csv = exportToCsv(sections)
    expect(csv).toContain('## Test Category')
    expect(csv).toContain('### Test Panel')
    expect(csv).toContain('name,value')
    expect(csv).toContain('aspirin,100')
    expect(csv).toContain('ibuprofen,200')
  })

  it('escapes commas in values', () => {
    const sections = [{
      category: 'Test',
      panels: [{
        title: 'Panel',
        data: [{ name: 'test, with comma' }]
      }]
    }]
    const csv = exportToCsv(sections)
    expect(csv).toContain('"test, with comma"')
  })

  it('skips sections with no panels', () => {
    const sections = [{
      category: 'Empty',
      panels: []
    }]
    const csv = exportToCsv(sections)
    expect(csv).not.toContain('Empty')
  })
})

describe('exportToJson', () => {
  it('produces valid JSON', () => {
    const sections = [{
      category: 'Test',
      panels: [{ title: 'Panel', data: [{ key: 'value' }] }]
    }]
    const json = exportToJson(sections)
    expect(() => JSON.parse(json)).not.toThrow()
  })
})
