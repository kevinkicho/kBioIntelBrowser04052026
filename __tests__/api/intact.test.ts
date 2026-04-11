import { GET } from '@/app/api/intact/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as intact from '@/lib/api/intact'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/intact')

describe('GET /api/intact/[id]', () => {
  test('returns molecular interactions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(intact.getMolecularInteractionsByName as jest.Mock).mockResolvedValue([
      {
        interactorA: 'ACE',
        interactorB: 'AGT',
        interactionType: 'physical association',
        detectionMethod: 'two hybrid',
        pubmedId: '12345678',
        confidenceScore: 0.85,
        url: 'https://www.ebi.ac.uk/intact/details/interaction/EBI-12345',
      },
    ])
    const req = new NextRequest('http://localhost/api/intact/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.molecularInteractions).toHaveLength(1)
    expect(data.molecularInteractions[0].interactorA).toBe('ACE')
    expect(data.molecularInteractions[0].interactorB).toBe('AGT')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/intact/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty molecularInteractions when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/intact/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.molecularInteractions).toEqual([])
  })
})
