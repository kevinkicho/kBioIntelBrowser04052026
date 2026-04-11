import { GET } from '@/app/api/orangebook/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as orangebook from '@/lib/api/orangebook'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/orangebook')

describe('GET /api/orangebook/[id]', () => {
  test('returns Orange Book entries for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 16132360,
      name: 'Liraglutide',
      synonyms: [],
    })
    ;(orangebook.getOrangeBookByName as jest.Mock).mockResolvedValue([{
      applicationNumber: 'NDA021457',
      sponsorName: 'NOVO NORDISK',
      approvalDate: '2024-03-15',
      activeIngredient: 'LIRAGLUTIDE',
      dosageForm: 'INJECTABLE',
      teCode: 'BX',
      patents: [],
      exclusivities: [],
    }])

    const req = new NextRequest('http://localhost/api/orangebook/16132360')
    const res = await GET(req, { params: { id: '16132360' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.orangeBookEntries).toHaveLength(1)
    expect(data.orangeBookEntries[0].applicationNumber).toBe('NDA021457')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/orangebook/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(orangebook.getOrangeBookByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/orangebook/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.orangeBookEntries).toEqual([])
  })
})
