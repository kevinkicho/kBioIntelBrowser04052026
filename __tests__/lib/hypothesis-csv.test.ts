import { exportMatchesToCsv } from '@/lib/hypothesis/csv'
import type { IntersectedMatch } from '@/lib/hypothesis/types'

describe('exportMatchesToCsv', () => {
  it('returns just the header for an empty list', () => {
    expect(exportMatchesToCsv([])).toBe('name,cid,reasons')
  })

  it('writes one row per match with semicolon-joined reasons', () => {
    const matches: IntersectedMatch[] = [
      { cid: 2244, name: 'Aspirin', reasons: ['Targets PTGS2', 'Phase 4 trial'] },
      { cid: 3672, name: 'Ibuprofen', reasons: ['Targets PTGS2'] },
    ]
    const csv = exportMatchesToCsv(matches)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('name,cid,reasons')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('Aspirin,2244,Targets PTGS2; Phase 4 trial')
    expect(lines[2]).toBe('Ibuprofen,3672,Targets PTGS2')
  })

  it('escapes commas, quotes, and newlines', () => {
    const matches: IntersectedMatch[] = [
      {
        cid: 1,
        name: 'Drug, with comma',
        reasons: ['Has "quotes"', 'multi\nline reason'],
      },
    ]
    const csv = exportMatchesToCsv(matches)
    const lines = csv.split('\n')
    // Comma in name → quoted
    expect(lines[1]).toContain('"Drug, with comma"')
    // Internal quotes are doubled
    expect(lines[1]).toContain('Has ""quotes""')
    // Reasons cell is fully quoted because of comma in join AND embedded
    // newline from one of the reasons.
    expect(csv).toMatch(/"Has ""quotes""; multi\nline reason"/)
  })

  it('writes the correct number of rows for many matches', () => {
    const matches: IntersectedMatch[] = Array.from({ length: 10 }, (_, i) => ({
      cid: i + 1,
      name: `drug${i}`,
      reasons: [`reason ${i}`],
    }))
    const csv = exportMatchesToCsv(matches)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(11) // header + 10 rows
    expect(lines[10]).toBe('drug9,10,reason 9')
  })

  it('handles missing/empty fields gracefully', () => {
    const matches: IntersectedMatch[] = [
      { cid: 0, name: '', reasons: [] },
    ]
    const csv = exportMatchesToCsv(matches)
    const lines = csv.split('\n')
    expect(lines[1]).toBe(',0,')
  })
})
