import { GET } from '@/app/api/search/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'

jest.mock('@/lib/api/pubchem')

describe('GET /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns suggestions for a valid query', async () => {
    const mockSearchByType = jest.mocked(pubchem.searchByType)
    mockSearchByType.mockResolvedValue(['insulin', 'Insulin Glargine'])

    const req = new NextRequest('http://localhost/api/search?q=insulin')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.suggestions).toEqual(['insulin', 'Insulin Glargine'])
  })

  test('returns 400 when query param is missing', async () => {
    const req = new NextRequest('http://localhost/api/search')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  test('returns 400 when query is too short', async () => {
    const req = new NextRequest('http://localhost/api/search?q=a')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
