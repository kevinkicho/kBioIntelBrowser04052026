/**
 * @jest-environment node
 */

import { getOpenFdaLabelSectionsByName } from '../openFdaLabelSections'

describe('openFdaLabelSections', () => {
  it('returns empty for short query without network', async () => {
    await expect(getOpenFdaLabelSectionsByName('a')).resolves.toEqual([])
    await expect(getOpenFdaLabelSectionsByName('')).resolves.toEqual([])
  })

  it('maps label sections and DailyMed setid link', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'label-1',
            openfda: {
              brand_name: ['VIREAD'],
              generic_name: ['TENOFOVIR DISOPROXIL FUMARATE'],
              manufacturer_name: ['Gilead Sciences, Inc.'],
              spl_set_id: ['abc-set-id'],
            },
            boxed_warning: ['Lactic acidosis and severe hepatomegaly with steatosis…'],
            indications_and_usage: ['Indicated for HIV-1 infection in combination with other agents.'],
            adverse_reactions: ['Most common adverse reactions include rash and diarrhea.'],
          },
        ],
      }),
    }))
    // @ts-expect-error test mock
    global.fetch = fetchMock

    const rows = await getOpenFdaLabelSectionsByName('viread', 3)
    expect(rows).toHaveLength(1)
    expect(rows[0].brandName).toBe('VIREAD')
    expect(rows[0].setId).toBe('abc-set-id')
    expect(rows[0].dailyMedUrl).toContain('setid=abc-set-id')
    const keys = rows[0].sections.map((s) => s.key)
    expect(keys).toContain('boxed_warning')
    expect(keys).toContain('indications_and_usage')
    expect(keys).toContain('adverse_reactions')
    expect(JSON.stringify(fetchMock.mock.calls)).toContain('+OR+')
  })

  it('skips records with no extractable sections', async () => {
    // @ts-expect-error test mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ id: 'empty', openfda: { brand_name: ['X'] } }],
      }),
    }))
    await expect(getOpenFdaLabelSectionsByName('xdrug')).resolves.toEqual([])
  })
})
