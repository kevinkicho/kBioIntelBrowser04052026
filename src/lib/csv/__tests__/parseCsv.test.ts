import { headerIndexMap, parseCsv, cellAt } from '../parseCsv'

describe('parseCsv', () => {
  it('handles quotes and commas', () => {
    const rows = parseCsv('a,b\n"hello, world",2\n')
    expect(rows[0]).toEqual(['a', 'b'])
    expect(rows[1]).toEqual(['hello, world', '2'])
  })

  it('maps headers case-insensitively', () => {
    const map = headerIndexMap(['BLA Number', 'Proper Name'])
    expect(cellAt(['125057', 'adalimumab'], map, 'bla number')).toBe('125057')
  })
})
