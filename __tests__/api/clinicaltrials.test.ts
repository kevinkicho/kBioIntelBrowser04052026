import { GET } from '@/app/api/clinicaltrials/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as clinicaltrials from '@/lib/api/clinicaltrials'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/clinicaltrials')

describe('GET /api/clinicaltrials/[id]', () => {
  test('returns trials for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(clinicaltrials.getClinicalTrialsByName as jest.Mock).mockResolvedValue([{
      nctId: 'NCT01272284',
      title: 'Liraglutide in Type 2 Diabetes',
      phase: 'PHASE3',
      status: 'COMPLETED',
      sponsor: 'Novo Nordisk',
      startDate: '2011-01-01',
      conditions: ['Type 2 Diabetes Mellitus'],
    }])

    const req = new NextRequest('http://localhost/api/clinicaltrials/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.trials).toHaveLength(1)
    expect(data.trials[0].nctId).toBe('NCT01272284')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/clinicaltrials/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty trials array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(clinicaltrials.getClinicalTrialsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/clinicaltrials/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.trials).toEqual([])
  })
})
