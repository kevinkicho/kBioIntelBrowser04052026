import { getBioAssaysByName } from '@/lib/api/bioassay'
import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

jest.mock('@/lib/api/chembl', () => ({
  getChemblActivitiesByName: jest.fn(),
}))

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const assayTable = {
  Table: {
    Columns: {
      Column: [
        'AID',
        'Assay Name',
        'Activity Outcome',
        'Target Accession',
        'Activity Value [uM]',
      ],
    },
    Row: [{ Cell: [12345, 'Cytotoxicity assay', 'Active', 'EGFR', 5.2] }],
  },
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  ;(getChemblActivitiesByName as jest.Mock).mockResolvedValue([])
})

describe('getBioAssaysByName', () => {
  test('returns parsed bioassay results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(assayTable))
    const results = await getBioAssaysByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].assayId).toBe('12345')
    expect(results[0].assayName).toBe('Cytotoxicity assay')
    expect(results[0].outcome).toBe('Active')
    expect(results[0].targetName).toBe('EGFR')
    expect(results[0].activityValue).toBe(5.2)
    expect(results[0].url).toBe('https://pubchem.ncbi.nlm.nih.gov/bioassay/12345')
    expect(getChemblActivitiesByName).not.toHaveBeenCalled()
  })

  test('limits results to 15', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      Cell: [i + 1, `Assay ${i}`, 'Active', 'Target', 1.0],
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        Table: {
          Columns: {
            Column: [
              'AID',
              'Assay Name',
              'Activity Outcome',
              'Target Accession',
              'Activity Value [uM]',
            ],
          },
          Row: rows,
        },
      }),
    )
    const results = await getBioAssaysByName('test')
    expect(results).toHaveLength(15)
  })

  test('defaults activityValue to 0 when missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        Table: {
          Columns: {
            Column: [
              'AID',
              'Assay Name',
              'Activity Outcome',
              'Target Accession',
              'Activity Value [uM]',
            ],
          },
          Row: [{ Cell: [100, 'Test', 'Inactive', 'TP53', null] }],
        },
      }),
    )
    const results = await getBioAssaysByName('test')
    expect(results[0].activityValue).toBe(0)
  })

  test('empty name without cid is empty (not fetched)', async () => {
    expect(await getBioAssaysByName('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 then ChEMBL zero-hit is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    expect(await getBioAssaysByName('unknownxyz')).toEqual([])
  })

  test('true empty table then ChEMBL zero-hit is empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    expect(await getBioAssaysByName('test')).toEqual([])
  })

  test('PubChem 503 falls back to ChEMBL rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([
      {
        activityId: 'a1',
        chemblId: 'CHEMBL25',
        assayType: 'B',
        standardType: 'IC50',
        activityType: 'IC50',
        standardValue: 12,
        activityValue: 12,
        standardUnits: 'nM',
        activityUnits: 'nM',
        targetName: 'COX1',
        url: 'https://www.ebi.ac.uk/chembl/activity_report_card/a1/',
      },
    ])
    const results = await getBioAssaysByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].assayId).toBe('a1')
    expect(results[0].targetName).toBe('COX1')
  })

  test('throws when PubChem and ChEMBL both fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValueOnce(new Error('HTTP 503'))
    await expect(getBioAssaysByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body when ChEMBL also fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValueOnce(new Error('HTML response from ChEMBL'))
    await expect(getBioAssaysByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error when ChEMBL also fails', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getBioAssaysByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('bioassay trackedSafe honesty', () => {
  test('both-fail HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValueOnce(new Error('HTTP 503'))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('bioassay', getBioAssaysByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'bioassay')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 then ChEMBL empty is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('bioassay', getBioAssaysByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'bioassay')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})