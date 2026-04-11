import { GET } from '@/app/api/pdbe-ligands/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as pdbeLigands from '@/lib/api/pdbe-ligands'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/pdbe-ligands')

describe('GET /api/pdbe-ligands/[id]', () => {
  test('returns ligands for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(pdbeLigands.getPdbeLigandsByName as jest.Mock).mockResolvedValue([{
      compId: 'ASP',
      name: 'ASPIRIN',
      formula: 'C9H8O4',
      molecularWeight: 180.16,
      inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      drugbankId: 'DB00945',
      url: 'https://www.ebi.ac.uk/pdbe/entry/pdb/ASP',
    }])

    const req = new NextRequest('http://localhost/api/pdbe-ligands/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pdbeLigands).toHaveLength(1)
    expect(data.pdbeLigands[0].compId).toBe('ASP')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/pdbe-ligands/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/pdbe-ligands/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pdbeLigands).toEqual([])
  })
})
