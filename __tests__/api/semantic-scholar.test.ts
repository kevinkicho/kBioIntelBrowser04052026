import { GET } from '@/app/api/semantic-scholar/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as semanticScholar from '@/lib/api/semantic-scholar'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/semantic-scholar')

describe('GET /api/semantic-scholar/[id]', () => {
  test('returns semantic papers for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(semanticScholar.getSemanticPapersByName as jest.Mock).mockResolvedValue([
      {
        paperId: 'abc123',
        title: 'Effects of Aspirin',
        year: 2023,
        citationCount: 42,
        tldr: 'Aspirin reduces inflammation.',
        url: 'https://semanticscholar.org/paper/abc123',
      },
    ])
    const req = new NextRequest('http://localhost/api/semantic-scholar/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.semanticPapers).toHaveLength(1)
    expect(data.semanticPapers[0].paperId).toBe('abc123')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/semantic-scholar/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty semanticPapers when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/semantic-scholar/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.semanticPapers).toEqual([])
  })
})
