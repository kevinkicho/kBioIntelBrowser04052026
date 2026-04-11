import { GET } from '@/app/api/monarch/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as monarch from '@/lib/api/monarch'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/monarch')

describe('GET /api/monarch/[id]', () => {
  test('returns diseases for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 4091,
      name: 'Metformin',
      synonyms: [],
    })
    ;(monarch.getMonarchDiseasesByName as jest.Mock).mockResolvedValue([{
      id: 'MONDO:0011993',
      name: 'type 2 diabetes mellitus',
      description: 'A form of diabetes.',
      category: 'biolink:Disease',
      phenotypeCount: 42,
      url: 'https://monarchinitiative.org/MONDO:0011993',
    }])

    const req = new NextRequest('http://localhost/api/monarch/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.monarchDiseases).toHaveLength(1)
    expect(data.monarchDiseases[0].id).toBe('MONDO:0011993')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/monarch/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/monarch/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.monarchDiseases).toEqual([])
  })
})
