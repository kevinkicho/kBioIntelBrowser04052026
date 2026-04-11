import { GET } from '@/app/api/pdb/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as pdb from '@/lib/api/pdb'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/pdb')

describe('GET /api/pdb/[id]', () => {
  test('returns PDB structures for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 176870,
      name: 'Erlotinib',
      synonyms: [],
    })
    ;(pdb.getPdbStructuresByName as jest.Mock).mockResolvedValue([{
      pdbId: '1M17',
      title: 'Crystal structure of EGFR with erlotinib',
      resolution: 2.6,
      method: 'X-RAY DIFFRACTION',
      depositionDate: '2023-05-10',
      url: 'https://www.rcsb.org/structure/1M17',
    }])

    const req = new NextRequest('http://localhost/api/pdb/176870')
    const res = await GET(req, { params: { id: '176870' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pdbStructures).toHaveLength(1)
    expect(data.pdbStructures[0].pdbId).toBe('1M17')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/pdb/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(pdb.getPdbStructuresByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/pdb/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pdbStructures).toEqual([])
  })
})
