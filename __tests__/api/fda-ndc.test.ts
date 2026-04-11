import { GET } from '@/app/api/fda-ndc/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as fdaNdc from '@/lib/api/fda-ndc'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/fda-ndc')

describe('GET /api/fda-ndc/[id]', () => {
  test('returns NDC products for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 3386,
      name: 'Fluoxetine',
      synonyms: [],
    })
    ;(fdaNdc.getNdcProductsByName as jest.Mock).mockResolvedValue([{
      productNdc: '0002-3227',
      brandName: 'PROZAC',
      genericName: 'FLUOXETINE HYDROCHLORIDE',
      dosageForm: 'CAPSULE',
      route: 'ORAL',
      marketingCategory: 'NDA',
      labelerName: 'Eli Lilly and Company',
      productType: 'HUMAN PRESCRIPTION DRUG',
      pharmClass: ['Serotonin Reuptake Inhibitor [EPC]'],
      url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=0002-3227',
    }])

    const req = new NextRequest('http://localhost/api/fda-ndc/3386')
    const res = await GET(req, { params: { id: '3386' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ndcProducts).toHaveLength(1)
    expect(data.ndcProducts[0].productNdc).toBe('0002-3227')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/fda-ndc/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(fdaNdc.getNdcProductsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/fda-ndc/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ndcProducts).toEqual([])
  })
})
