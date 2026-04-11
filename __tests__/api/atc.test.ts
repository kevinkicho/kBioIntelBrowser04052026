import { GET } from '@/app/api/atc/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as atc from '@/lib/api/atc'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/atc')

describe('GET /api/atc/[id]', () => {
  test('returns classifications for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 4091, name: 'Metformin', synonyms: [] })
    ;(atc.getAtcClassificationsByName as jest.Mock).mockResolvedValue([
      { code: 'A10BA02', name: 'metformin', classType: 'ATC1-4' },
    ])
    const req = new NextRequest('http://localhost/api/atc/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.classifications).toHaveLength(1)
    expect(data.classifications[0].code).toBe('A10BA02')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/atc/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty classifications when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(atc.getAtcClassificationsByName as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/atc/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.classifications).toEqual([])
  })
})
