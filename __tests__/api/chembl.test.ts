import { GET } from '@/app/api/chembl/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as chembl from '@/lib/api/chembl'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/chembl')

describe('GET /api/chembl/[id]', () => {
  test('returns activities for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(chembl.getChemblActivitiesByName as jest.Mock).mockResolvedValue([{
      targetName: 'Cyclooxygenase-2',
      activityType: 'IC50',
      activityValue: 0.04,
      activityUnits: 'uM',
      assayType: 'B',
      chemblId: 'CHEMBL25',
    }])

    const req = new NextRequest('http://localhost/api/chembl/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.activities).toHaveLength(1)
    expect(data.activities[0].targetName).toBe('Cyclooxygenase-2')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/chembl/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty activities array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(chembl.getChemblActivitiesByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/chembl/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.activities).toEqual([])
  })
})
