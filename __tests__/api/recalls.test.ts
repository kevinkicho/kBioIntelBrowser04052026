import { GET } from '@/app/api/recalls/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as recalls from '@/lib/api/recalls'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/recalls')

describe('GET /api/recalls/[id]', () => {
  test('returns recalls for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 4091,
      name: 'Metformin',
      synonyms: [],
    })
    ;(recalls.getDrugRecallsByName as jest.Mock).mockResolvedValue([{
      recallNumber: 'D-0123-2025',
      classification: 'Class II',
      reason: 'Failed dissolution specifications',
      description: 'Metformin HCl 500mg tablets',
      recallingFirm: 'Pharma Corp',
      reportDate: '2025-01-15',
      status: 'Ongoing',
      city: 'Newark',
      state: 'NJ',
    }])

    const req = new NextRequest('http://localhost/api/recalls/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.drugRecalls).toHaveLength(1)
    expect(data.drugRecalls[0].recallNumber).toBe('D-0123-2025')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/recalls/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(recalls.getDrugRecallsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/recalls/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.drugRecalls).toEqual([])
  })
})
