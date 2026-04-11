import { GET } from '@/app/api/adverseevents/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as adverseevents from '@/lib/api/adverseevents'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/adverseevents')

describe('GET /api/adverseevents/[id]', () => {
  test('returns adverse events for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(adverseevents.getAdverseEventsByName as jest.Mock).mockResolvedValue([{
      reactionName: 'nausea',
      count: 1523,
      serious: 45,
      outcome: 'recovered/resolved',
    }])

    const req = new NextRequest('http://localhost/api/adverseevents/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.adverseEvents).toHaveLength(1)
    expect(data.adverseEvents[0].reactionName).toBe('nausea')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/adverseevents/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty adverseEvents array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(adverseevents.getAdverseEventsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/adverseevents/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.adverseEvents).toEqual([])
  })
})
