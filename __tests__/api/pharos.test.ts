import { GET } from '@/app/api/pharos/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as pharos from '@/lib/api/pharos'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/pharos')

describe('GET /api/pharos/[id]', () => {
  test('returns targets for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(pharos.getPharosTargetsByName as jest.Mock).mockResolvedValue([
      { name: 'ACE', tdl: 'Tclin', family: 'Enzyme', description: '', novelty: 3.5, url: '' },
    ])
    const req = new NextRequest('http://localhost/api/pharos/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.pharosTargets).toHaveLength(1)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/pharos/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/pharos/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.pharosTargets).toEqual([])
  })
})
