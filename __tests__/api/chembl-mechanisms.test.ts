import { GET } from '@/app/api/chembl-mechanisms/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as chemblMechanisms from '@/lib/api/chembl-mechanisms'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/chembl-mechanisms')

describe('GET /api/chembl-mechanisms/[id]', () => {
  test('returns mechanisms for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(chemblMechanisms.getChemblMechanismsByName as jest.Mock).mockResolvedValue([{
      mechanismOfAction: 'Cyclooxygenase inhibitor',
      actionType: 'INHIBITOR',
      targetChemblId: 'CHEMBL2094253',
      maxPhase: 4,
      directInteraction: true,
      url: 'https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL2094253/',
    }])

    const req = new NextRequest('http://localhost/api/chembl-mechanisms/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chemblMechanisms).toHaveLength(1)
    expect(data.chemblMechanisms[0].mechanismOfAction).toBe('Cyclooxygenase inhibitor')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/chembl-mechanisms/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(chemblMechanisms.getChemblMechanismsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/chembl-mechanisms/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.chemblMechanisms).toEqual([])
  })
})
