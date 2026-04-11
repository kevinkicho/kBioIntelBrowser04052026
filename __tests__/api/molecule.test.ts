import { GET } from '@/app/api/molecule/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'

jest.mock('@/lib/api/pubchem')

describe('GET /api/molecule/[id]', () => {
  test('returns molecule data for a valid CID', async () => {
    const mockGetMoleculeById = pubchem.getMoleculeById as jest.Mock
    mockGetMoleculeById.mockResolvedValue({
      cid: 5793,
      name: 'Glucose',
      formula: 'C6H12O6',
      iupacName: 'D-glucose',
      molecularWeight: 180.16,
      classification: 'metabolite',
      synonyms: ['Dextrose'],
      structureImageUrl: 'https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5793&t=l',
    })

    const req = new NextRequest('http://localhost/api/molecule/5793')
    const res = await GET(req, { params: { id: '5793' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.molecule.cid).toBe(5793)
    expect(data.molecule.name).toBe('Glucose')
  })

  test('returns 404 when molecule not found', async () => {
    const mockGetMoleculeById = pubchem.getMoleculeById as jest.Mock
    mockGetMoleculeById.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/molecule/9999999999')
    const res = await GET(req, { params: { id: '9999999999' } })
    expect(res.status).toBe(404)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/molecule/notanid')
    const res = await GET(req, { params: { id: 'notanid' } })
    expect(res.status).toBe(400)
  })
})
