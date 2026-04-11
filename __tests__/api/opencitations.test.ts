import { GET } from '@/app/api/opencitations/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as europepmc from '@/lib/api/europepmc'
import * as opencitations from '@/lib/api/opencitations'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/europepmc')
jest.mock('@/lib/api/opencitations')

describe('GET /api/opencitations/[id]', () => {
  test('returns citation metrics for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(europepmc.getLiteratureByName as jest.Mock).mockResolvedValue([
      { title: 'Paper A', authors: '', journal: '', year: 2023, citedByCount: 10, doi: '10.1000/a', pmid: '' },
    ])
    ;(opencitations.getCitationMetrics as jest.Mock).mockResolvedValue([
      {
        doi: '10.1000/a',
        title: '',
        citationCount: 42,
        url: 'https://doi.org/10.1000/a',
      },
    ])
    const req = new NextRequest('http://localhost/api/opencitations/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.citationMetrics).toHaveLength(1)
    expect(data.citationMetrics[0].doi).toBe('10.1000/a')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/opencitations/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty citationMetrics when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/opencitations/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.citationMetrics).toEqual([])
  })

  test('filters out empty DOIs from literature', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(europepmc.getLiteratureByName as jest.Mock).mockResolvedValue([
      { title: 'Paper A', authors: '', journal: '', year: 2023, citedByCount: 10, doi: '', pmid: '' },
      { title: 'Paper B', authors: '', journal: '', year: 2023, citedByCount: 5, doi: '10.1000/b', pmid: '' },
    ])
    ;(opencitations.getCitationMetrics as jest.Mock).mockResolvedValue([
      { doi: '10.1000/b', title: '', citationCount: 5, url: 'https://doi.org/10.1000/b' },
    ])
    const req = new NextRequest('http://localhost/api/opencitations/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(opencitations.getCitationMetrics).toHaveBeenCalledWith(['10.1000/b'])
    expect(data.citationMetrics).toHaveLength(1)
  })
})
