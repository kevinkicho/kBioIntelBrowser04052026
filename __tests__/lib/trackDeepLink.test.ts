import { trackSourceDeepLink } from '@/lib/trackDeepLink'
import { emitProductEvent, readQueuedProductEvents, clearQueuedProductEvents } from '@/lib/productEvents'

jest.mock('@/lib/productEvents', () => {
  const actual = jest.requireActual('@/lib/productEvents')
  return {
    ...actual,
    emitProductEvent: jest.fn(actual.emitProductEvent),
  }
})

describe('trackSourceDeepLink', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('emits source_deep_link_opened product event', () => {
    trackSourceDeepLink('chembl', {
      href: 'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
      panelId: 'chembl',
      label: 'CHEMBL25',
    })
    expect(emitProductEvent).toHaveBeenCalledWith(
      'source_deep_link_opened',
      expect.objectContaining({
        source: 'chembl',
        panelId: 'chembl',
      }),
    )
    const names = readQueuedProductEvents().map((e) => e.name)
    expect(names).toContain('source_deep_link_opened')
    clearQueuedProductEvents()
  })
})
