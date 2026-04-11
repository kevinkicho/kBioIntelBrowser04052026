import { GET } from '@/app/api/chebi/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as chebi from '@/lib/api/chebi'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/chebi')

describe('GET /api/chebi/[id]', () => {
  test('returns ChEBI annotation for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(chebi.getChebiAnnotationByName as jest.Mock).mockResolvedValue({
      chebiId: 'CHEBI:71072',
      name: 'liraglutide',
      definition: 'A glucagon-like peptide-1 receptor agonist.',
      roles: ['antidiabetic drug'],
      url: 'https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:71072',
    })

    const req = new NextRequest('http://localhost/api/chebi/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chebiAnnotation.chebiId).toBe('CHEBI:71072')
    expect(data.chebiAnnotation.name).toBe('liraglutide')
  })

  test('returns null chebiAnnotation when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(chebi.getChebiAnnotationByName as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/chebi/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chebiAnnotation).toBeNull()
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/chebi/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns null chebiAnnotation when API returns null', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'aspirin',
      synonyms: [],
    })
    ;(chebi.getChebiAnnotationByName as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/chebi/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chebiAnnotation).toBeNull()
  })
})
