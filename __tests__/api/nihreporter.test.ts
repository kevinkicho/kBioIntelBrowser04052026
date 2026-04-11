import { GET } from '@/app/api/nihreporter/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as nihreporter from '@/lib/api/nihreporter'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/nihreporter')

describe('GET /api/nihreporter/[id]', () => {
  test('returns grants for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(nihreporter.getNihGrantsByName as jest.Mock).mockResolvedValue([{
      projectNumber: 'R01DK099039',
      title: 'GLP-1 Mechanisms in Beta Cell Function',
      piName: 'SMITH, JANE',
      institute: 'National Institute of Diabetes',
      fundingAmount: 450000,
      startDate: '2020-09-01',
      endDate: '2025-08-31',
    }])

    const req = new NextRequest('http://localhost/api/nihreporter/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.grants).toHaveLength(1)
    expect(data.grants[0].projectNumber).toBe('R01DK099039')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/nihreporter/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty grants array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(nihreporter.getNihGrantsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/nihreporter/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.grants).toEqual([])
  })
})
