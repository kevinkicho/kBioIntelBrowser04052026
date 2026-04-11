import { GET } from '@/app/api/pathway-commons/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as pathwayCommons from '@/lib/api/pathway-commons'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/pathway-commons')

describe('GET /api/pathway-commons/[id]', () => {
  test('returns pathway commons results for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(pathwayCommons.getPathwayCommonsByName as jest.Mock).mockResolvedValue([
      {
        uri: 'https://reactome.org/content/detail/R-HSA-123',
        name: 'Aspirin Metabolism',
        dataSource: 'Reactome',
        numParticipants: 15,
        url: 'https://reactome.org/content/detail/R-HSA-123',
      },
    ])
    const req = new NextRequest('http://localhost/api/pathway-commons/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.pathwayCommonsResults).toHaveLength(1)
    expect(data.pathwayCommonsResults[0].name).toBe('Aspirin Metabolism')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/pathway-commons/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty pathwayCommonsResults when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/pathway-commons/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.pathwayCommonsResults).toEqual([])
  })
})
