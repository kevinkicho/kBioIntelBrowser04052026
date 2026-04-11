import { GET } from '@/app/api/wikipathways/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as wikipathways from '@/lib/api/wikipathways'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/wikipathways')

describe('GET /api/wikipathways/[id]', () => {
  test('returns pathways for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(wikipathways.getWikiPathwaysByName as jest.Mock).mockResolvedValue([
      {
        id: 'WP123',
        name: 'ACE Inhibitor Pathway',
        species: 'Homo sapiens',
        url: 'https://www.wikipathways.org/pathways/WP123',
      },
    ])
    const req = new NextRequest('http://localhost/api/wikipathways/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.wikiPathways).toHaveLength(1)
    expect(data.wikiPathways[0].id).toBe('WP123')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/wikipathways/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty wikiPathways when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/wikipathways/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.wikiPathways).toEqual([])
  })
})
