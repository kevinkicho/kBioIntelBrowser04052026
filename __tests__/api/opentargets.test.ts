import { GET } from '@/app/api/opentargets/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as opentargets from '@/lib/api/opentargets'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/opentargets')

describe('GET /api/opentargets/[id]', () => {
  test('returns disease associations for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(opentargets.getDiseaseAssociationsByName as jest.Mock).mockResolvedValue([{
      diseaseId: 'EFO_0000311',
      diseaseName: 'Type 2 diabetes mellitus',
      therapeuticAreas: ['Metabolic disease'],
    }])

    const req = new NextRequest('http://localhost/api/opentargets/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.diseases).toHaveLength(1)
    expect(data.diseases[0].diseaseName).toBe('Type 2 diabetes mellitus')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/opentargets/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty diseases array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(opentargets.getDiseaseAssociationsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/opentargets/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.diseases).toEqual([])
  })
})
