import {
  applyFilterSort,
  alphaSortOptions,
  dateSortOptions,
  parseListDate,
} from '@/lib/listControls'

describe('listControls', () => {
  test('parseListDate handles ISO and year', () => {
    expect(parseListDate('2024-06-15')).toBeGreaterThan(parseListDate('2020-01-01'))
    expect(parseListDate(2023)).toBeGreaterThan(0)
    expect(parseListDate('')).toBe(0)
  })

  test('applyFilterSort filters by query and sorts', () => {
    const items = [
      { name: 'Zebra', year: 2020 },
      { name: 'Apple', year: 2024 },
      { name: 'Mango', year: 2022 },
    ]
    const sorts = [
      ...dateSortOptions<(typeof items)[0]>((x) => x.year),
      ...alphaSortOptions<(typeof items)[0]>((x) => x.name),
    ]
    // Query 'pp' matches Apple only among fruit names; 'a' would also hit Zebra.
    const filtered = applyFilterSort(items, {
      query: 'a',
      getSearchText: (x) => x.name,
      sortId: 'date-desc',
      sortOptions: sorts,
    })
    expect(filtered.map((x) => x.name)).toEqual(['Apple', 'Mango', 'Zebra'])

    const appleOnly = applyFilterSort(items, {
      query: 'pp',
      getSearchText: (x) => x.name,
      sortId: 'date-desc',
      sortOptions: sorts,
    })
    expect(appleOnly.map((x) => x.name)).toEqual(['Apple'])
  })

  test('date-desc puts newest first', () => {
    const items = [
      { d: '2019-01-01' },
      { d: '2024-12-01' },
      { d: '2021-06-01' },
    ]
    const out = applyFilterSort(items, {
      query: '',
      getSearchText: () => '',
      sortId: 'date-desc',
      sortOptions: dateSortOptions((x) => x.d),
    })
    expect(out.map((x) => x.d)).toEqual(['2024-12-01', '2021-06-01', '2019-01-01'])
  })
})
