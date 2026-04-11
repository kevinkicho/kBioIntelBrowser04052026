import { GET } from '@/app/api/iuphar/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as iuphar from '@/lib/api/iuphar'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/iuphar')

describe('GET /api/iuphar/[id]', () => {
  test('returns pharmacology targets for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(iuphar.getPharmacologyTargetsByName as jest.Mock).mockResolvedValue([
      {
        targetName: 'GLP1R',
        type: 'agonist',
        affinity: '0.52 nM',
        species: 'Human',
        primaryTarget: true,
        url: 'https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314',
      },
    ])

    const req = new NextRequest('http://localhost/api/iuphar/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pharmacologyTargets).toHaveLength(1)
    expect(data.pharmacologyTargets[0].targetName).toBe('GLP1R')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/iuphar/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(iuphar.getPharmacologyTargetsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/iuphar/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.pharmacologyTargets).toEqual([])
  })
})
