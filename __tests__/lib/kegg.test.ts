import { getKeggCompoundId, getKeggReactions } from '@/lib/api/kegg'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getKeggCompoundId', () => {
  test('returns KEGG compound ID for a known molecule name', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => 'cpd:C00031\tD-Glucose; Grape sugar; Dextrose\ncpd:C00221\tbeta-D-Glucose\n',
    })
    const id = await getKeggCompoundId('glucose')
    expect(id).toBe('C00031')
  })

  test('returns null when compound not found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const id = await getKeggCompoundId('xyzunknown')
    expect(id).toBeNull()
  })
})

describe('getKeggReactions', () => {
  test('returns reaction list for a known compound', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => 'rn:R00010\tR00010\nrn:R00014\tR00014\n',
    })
    const reactions = await getKeggReactions('C00031')
    expect(reactions).toContain('R00010')
    expect(reactions).toContain('R00014')
  })

  test('returns empty array when no reactions found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const reactions = await getKeggReactions('C99999')
    expect(reactions).toEqual([])
  })
})
