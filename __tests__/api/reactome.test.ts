import { GET } from '@/app/api/reactome/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as reactome from '@/lib/api/reactome'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/reactome')

describe('GET /api/reactome/[id]', () => {
  test('returns pathways for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(reactome.getReactomePathwaysByName as jest.Mock).mockResolvedValue([{
      stId: 'R-HSA-2162123',
      name: 'Synthesis of Prostaglandins (PG)',
      species: 'Homo sapiens',
      summation: 'Prostaglandins are synthesized from arachidonic acid.',
      url: 'https://reactome.org/content/detail/R-HSA-2162123',
    }])

    const req = new NextRequest('http://localhost/api/reactome/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.reactomePathways).toHaveLength(1)
    expect(data.reactomePathways[0].stId).toBe('R-HSA-2162123')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/reactome/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(reactome.getReactomePathwaysByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/reactome/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.reactomePathways).toEqual([])
  })
})
