import { GET } from '@/app/api/stitch/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as stitch from '@/lib/api/stitch'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/stitch')

describe('GET /api/stitch/[id]', () => {
  test('returns interactions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(stitch.getChemicalInteractionsByName as jest.Mock).mockResolvedValue([
      { chemicalId: 'CIDm002244', chemicalName: 'aspirin', proteinId: '9606.ENSP00000379200', proteinName: 'PTGS2', combinedScore: 0.95, experimentalScore: 0.7, databaseScore: 0.8, textminingScore: 0.6, url: '' },
    ])
    const req = new NextRequest('http://localhost/api/stitch/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.chemicalProteinInteractions).toHaveLength(1)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/stitch/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/stitch/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.chemicalProteinInteractions).toEqual([])
  })
})
