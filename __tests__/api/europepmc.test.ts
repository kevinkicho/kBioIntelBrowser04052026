import { GET } from '@/app/api/europepmc/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as europepmc from '@/lib/api/europepmc'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/europepmc')

describe('GET /api/europepmc/[id]', () => {
  test('returns results for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 4091, name: 'Metformin', synonyms: [],
    })
    ;(europepmc.getLiteratureByName as jest.Mock).mockResolvedValue([{
      title: 'Metformin and cancer risk', authors: 'Smith J',
      journal: 'Nature Reviews', year: 2021, citedByCount: 342,
      doi: '10.1038/nrd.2021.12', pmid: '33456789',
    }])

    const req = new NextRequest('http://localhost/api/europepmc/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Metformin and cancer risk')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/europepmc/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty results array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(europepmc.getLiteratureByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/europepmc/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toEqual([])
  })
})
