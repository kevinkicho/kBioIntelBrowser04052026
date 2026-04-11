import { GET } from '@/app/api/clinvar/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as clinvar from '@/lib/api/clinvar'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/clinvar')

describe('GET /api/clinvar/[id]', () => {
  test('returns variants for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(clinvar.getClinVarVariantsByName as jest.Mock).mockResolvedValue([
      {
        variantId: '12345',
        clinicalSignificance: 'Pathogenic',
        conditionName: 'Androgen insensitivity syndrome',
        geneSymbol: 'AR',
        title: 'NM_000044.6(AR):c.2596G>A (p.Val866Met)',
        variantType: 'single nucleotide variant',
        chromosome: 'X',
        position: 67544202,
        reviewStatus: 'criteria provided, single submitter',
        url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/',
      },
    ])
    const req = new NextRequest('http://localhost/api/clinvar/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.clinVarVariants).toHaveLength(1)
    expect(data.clinVarVariants[0].clinicalSignificance).toBe('Pathogenic')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/clinvar/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty clinVarVariants when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/clinvar/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.clinVarVariants).toEqual([])
  })
})
