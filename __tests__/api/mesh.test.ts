import { GET } from '@/app/api/mesh/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as mesh from '@/lib/api/mesh'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/mesh')

describe('GET /api/mesh/[id]', () => {
  test('returns mesh terms for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(mesh.getMeshTermsByName as jest.Mock).mockResolvedValue([
      {
        uid: 'D001241',
        name: 'Aspirin',
        scopeNote: 'A non-steroidal anti-inflammatory agent.',
        treeNumbers: [],
        url: 'https://meshb.nlm.nih.gov/record/ui?ui=D001241',
      },
    ])
    const req = new NextRequest('http://localhost/api/mesh/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.meshTerms).toHaveLength(1)
    expect(data.meshTerms[0].uid).toBe('D001241')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/mesh/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty meshTerms when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/mesh/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.meshTerms).toEqual([])
  })
})
