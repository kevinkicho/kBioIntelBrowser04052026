import { GET } from '@/app/api/string-db/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as stringDb from '@/lib/api/string-db'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/string-db')

describe('GET /api/string-db/[id]', () => {
  test('returns protein interactions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(stringDb.getProteinInteractionsByName as jest.Mock).mockResolvedValue([
      {
        proteinA: 'ACE',
        proteinB: 'AGT',
        score: 0.999,
        experimentalScore: 0.8,
        databaseScore: 0.9,
        textminingScore: 0.7,
        url: 'https://string-db.org/network/9606.ENSP00000290421',
      },
    ])
    const req = new NextRequest('http://localhost/api/string-db/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinInteractions).toHaveLength(1)
    expect(data.proteinInteractions[0].proteinA).toBe('ACE')
    expect(data.proteinInteractions[0].proteinB).toBe('AGT')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/string-db/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty proteinInteractions when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/string-db/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinInteractions).toEqual([])
  })
})
