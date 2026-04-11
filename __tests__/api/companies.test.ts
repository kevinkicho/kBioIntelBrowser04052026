import { GET } from '@/app/api/companies/[id]/route'
import { NextRequest } from 'next/server'
import * as openfda from '@/lib/api/openfda'
import * as pubchem from '@/lib/api/pubchem'

jest.mock('@/lib/api/openfda')
jest.mock('@/lib/api/pubchem')

describe('GET /api/companies/[id]', () => {
  test('returns companies for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: ['Victoza', 'liraglutide'],
    })
    ;(openfda.getDrugsByIngredient as jest.Mock).mockResolvedValue([{
      company: 'Novo Nordisk',
      brandName: 'Victoza',
      genericName: 'LIRAGLUTIDE',
      productType: 'HUMAN PRESCRIPTION DRUG',
      route: 'SUBCUTANEOUS',
    }])

    const req = new NextRequest('http://localhost/api/companies/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.companies).toHaveLength(1)
    expect(data.companies[0].company).toBe('Novo Nordisk')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/companies/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })
})
