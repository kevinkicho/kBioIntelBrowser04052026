import { GET } from '@/app/api/gwas-catalog/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as gwasCatalog from '@/lib/api/gwas-catalog'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/gwas-catalog')

describe('GET /api/gwas-catalog/[id]', () => {
  test('returns GWAS associations for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(gwasCatalog.getGwasAssociationsByName as jest.Mock).mockResolvedValue([
      {
        traitName: 'Type 2 Diabetes',
        pValue: 1.5e-8,
        riskAllele: 'rs123-A',
        region: '6p21',
        studyId: 'GCST001234',
        url: 'https://www.ebi.ac.uk/gwas/search?query=Aspirin',
      },
    ])
    const req = new NextRequest('http://localhost/api/gwas-catalog/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.gwasAssociations).toHaveLength(1)
    expect(data.gwasAssociations[0].traitName).toBe('Type 2 Diabetes')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/gwas-catalog/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty gwasAssociations when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/gwas-catalog/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.gwasAssociations).toEqual([])
  })
})
