import { GET } from '@/app/api/chembl-indications/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as chemblIndications from '@/lib/api/chembl-indications'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/chembl-indications')

describe('GET /api/chembl-indications/[id]', () => {
  test('returns indications for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(chemblIndications.getChemblIndicationsByName as jest.Mock).mockResolvedValue([{
      meshHeading: 'Pain',
      meshId: 'D010146',
      efoTerm: 'pain',
      efoId: 'EFO_0003843',
      maxPhaseForIndication: 4,
      url: 'https://www.ebi.ac.uk/chembl/g/#browse/drug_indications/filter/molecule_chembl_id:CHEMBL25',
    }])

    const req = new NextRequest('http://localhost/api/chembl-indications/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chemblIndications).toHaveLength(1)
    expect(data.chemblIndications[0].meshHeading).toBe('Pain')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/chembl-indications/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(chemblIndications.getChemblIndicationsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/chembl-indications/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chemblIndications).toEqual([])
  })
})
