import { GET } from '@/app/api/synthesis/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as kegg from '@/lib/api/kegg'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/kegg')
jest.mock('@/lib/api/rhea', () => ({ getRheaSynthesisRoutes: jest.fn().mockResolvedValue([]) }))

describe('GET /api/synthesis/[id]', () => {
  test('returns synthesis routes for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5793, name: 'Glucose', synonyms: [] })
    ;(kegg.getKeggCompoundId as jest.Mock).mockResolvedValue('C00031')
    ;(kegg.getKeggReactions as jest.Mock).mockResolvedValue(['R00010'])
    ;(kegg.getKeggReactionDetail as jest.Mock).mockResolvedValue({
      id: 'R00010', name: 'Glucose phosphorylation', equation: 'ATP + D-Glucose => ADP + D-Glucose-6P', enzymes: ['2.7.1.1']
    })

    const req = new NextRequest('http://localhost/api/synthesis/5793')
    const res = await GET(req, { params: { id: '5793' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data.routes)).toBe(true)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/synthesis/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })
})
