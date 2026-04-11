import { GET } from '@/app/api/dailymed/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as dailymed from '@/lib/api/dailymed'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/dailymed')

describe('GET /api/dailymed/[id]', () => {
  test('returns labels for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 4091, name: 'Metformin', synonyms: [] })
    ;(dailymed.getDrugLabelsByName as jest.Mock).mockResolvedValue([{
      title: 'METFORMIN HYDROCHLORIDE tablet', setId: 'abc-123',
      publishedDate: '2024-01-15', dosageForm: 'TABLET', route: 'ORAL',
      labelerName: 'Teva', dailyMedUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123',
    }])
    const req = new NextRequest('http://localhost/api/dailymed/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.labels).toHaveLength(1)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/dailymed/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty labels when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(dailymed.getDrugLabelsByName as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/dailymed/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.labels).toEqual([])
  })
})
