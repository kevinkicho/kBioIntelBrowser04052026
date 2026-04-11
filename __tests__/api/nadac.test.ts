import { GET } from '@/app/api/nadac/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as nadac from '@/lib/api/nadac'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/nadac')

describe('GET /api/nadac/[id]', () => {
  test('returns drug prices for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(nadac.getDrugPricesByName as jest.Mock).mockResolvedValue([
      {
        ndcDescription: 'ASPIRIN 325 MG TABLET',
        nadacPerUnit: 0.0123,
        effectiveDate: '2025-01-01',
        pharmacyType: 'RETAIL',
        pricingUnit: 'EA',
        url: 'https://data.medicaid.gov/dataset/nadac',
      },
    ])
    const req = new NextRequest('http://localhost/api/nadac/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.drugPrices).toHaveLength(1)
    expect(data.drugPrices[0].ndcDescription).toBe('ASPIRIN 325 MG TABLET')
    expect(data.drugPrices[0].nadacPerUnit).toBe(0.0123)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/nadac/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty drugPrices when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/nadac/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.drugPrices).toEqual([])
  })
})
