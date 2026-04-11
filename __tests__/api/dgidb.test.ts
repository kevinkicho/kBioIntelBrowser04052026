import { GET } from '@/app/api/dgidb/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as dgidb from '@/lib/api/dgidb'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/dgidb')

describe('GET /api/dgidb/[id]', () => {
  test('returns interactions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(dgidb.getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([
      { geneName: 'PTGS2', interactionType: 'inhibitor', source: 'DrugBank', score: 8.5, url: '' },
    ])
    const req = new NextRequest('http://localhost/api/dgidb/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.drugGeneInteractions).toHaveLength(1)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/dgidb/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/dgidb/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.drugGeneInteractions).toEqual([])
  })
})
