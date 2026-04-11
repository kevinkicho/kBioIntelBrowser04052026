import { GET } from '@/app/api/patents/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as patents from '@/lib/api/patents'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/patents')

describe('GET /api/patents/[id]', () => {
  test('returns patents for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(patents.getPatentsByMoleculeName as jest.Mock).mockResolvedValue([{
      patentNumber: 'US8114833',
      title: 'GLP-1 receptor agonists',
      assignee: 'Novo Nordisk',
      filingDate: '2012-02-14',
      expiryDate: '',
      abstract: 'A compound useful for treating diabetes.',
    }])

    const req = new NextRequest('http://localhost/api/patents/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.patents).toHaveLength(1)
    expect(data.patents[0].patentNumber).toBe('US8114833')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/patents/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty patents array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(patents.getPatentsByMoleculeName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/patents/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.patents).toEqual([])
  })
})
