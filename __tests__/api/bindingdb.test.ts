import { GET } from '@/app/api/bindingdb/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as bindingdb from '@/lib/api/bindingdb'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/bindingdb')

describe('GET /api/bindingdb/[id]', () => {
  test('returns binding affinities for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(bindingdb.getBindingAffinitiesByName as jest.Mock).mockResolvedValue([
      {
        targetName: 'GLP-1 receptor',
        affinityType: 'Ki',
        affinityValue: 0.52,
        affinityUnits: 'nM',
        source: 'Knudsen et al 2010',
        doi: '10.1021/jm901513s',
      },
    ])

    const req = new NextRequest('http://localhost/api/bindingdb/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.bindingAffinities).toHaveLength(1)
    expect(data.bindingAffinities[0].targetName).toBe('GLP-1 receptor')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/bindingdb/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(bindingdb.getBindingAffinitiesByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/bindingdb/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.bindingAffinities).toEqual([])
  })
})
