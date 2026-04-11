import { GET } from '@/app/api/openalex/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as openalex from '@/lib/api/openalex'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/openalex')

describe('GET /api/openalex/[id]', () => {
  test('returns OpenAlex works for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(openalex.getOpenAlexWorksByName as jest.Mock).mockResolvedValue([
      {
        id: 'https://openalex.org/W123',
        title: 'Effects of Aspirin',
        year: 2023,
        citationCount: 42,
        openAccessUrl: 'https://example.com/paper.pdf',
        type: 'article',
        url: 'https://doi.org/10.1234/test',
      },
    ])
    const req = new NextRequest('http://localhost/api/openalex/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.openAlexWorks).toHaveLength(1)
    expect(data.openAlexWorks[0].id).toBe('https://openalex.org/W123')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/openalex/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty openAlexWorks when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/openalex/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.openAlexWorks).toEqual([])
  })
})
