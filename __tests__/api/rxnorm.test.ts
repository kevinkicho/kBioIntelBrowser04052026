import { GET } from '@/app/api/rxnorm/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as rxnorm from '@/lib/api/rxnorm'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/rxnorm')

describe('GET /api/rxnorm/[id]', () => {
  test('returns interactions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 4091, name: 'Metformin', synonyms: [],
    })
    ;(rxnorm.getDrugInteractionsByName as jest.Mock).mockResolvedValue([{
      drugName: 'Warfarin', severity: 'moderate',
      description: 'May increase anticoagulant effect.', sourceName: 'DrugBank',
    }])

    const req = new NextRequest('http://localhost/api/rxnorm/4091')
    const res = await GET(req, { params: { id: '4091' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.interactions).toHaveLength(1)
    expect(data.interactions[0].drugName).toBe('Warfarin')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/rxnorm/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty interactions array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(rxnorm.getDrugInteractionsByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/rxnorm/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.interactions).toEqual([])
  })
})
