import { GET } from '@/app/api/secedgar/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as secedgar from '@/lib/api/secedgar'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/secedgar')

describe('GET /api/secedgar/[id]', () => {
  test('returns filings for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(secedgar.getSecFilingsByName as jest.Mock).mockResolvedValue([{
      companyName: 'Novo Nordisk A/S',
      cik: '1341439',
      formType: '10-K',
      filingDate: '2023-02-15',
      description: 'Period: 2022-12-31',
      url: 'https://www.sec.gov/Archives/edgar/data/1341439/000134143923000010',
    }])

    const req = new NextRequest('http://localhost/api/secedgar/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.filings).toHaveLength(1)
    expect(data.filings[0].companyName).toBe('Novo Nordisk A/S')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/secedgar/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty filings array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(secedgar.getSecFilingsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/secedgar/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.filings).toEqual([])
  })
})
