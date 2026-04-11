import { GET } from '@/app/api/hazards/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchemHazards from '@/lib/api/pubchem-hazards'

jest.mock('@/lib/api/pubchem-hazards')

describe('GET /api/hazards/[id]', () => {
  test('returns hazard data for a valid CID', async () => {
    ;(pubchemHazards.getGhsHazardsByCid as jest.Mock).mockResolvedValue({
      signalWord: 'Danger',
      pictogramUrls: ['https://example.com/GHS07.svg'],
      hazardStatements: ['H302: Harmful if swallowed'],
      precautionaryStatements: ['P264: Wash hands'],
    })

    const req = new NextRequest('http://localhost/api/hazards/702')
    const res = await GET(req, { params: { id: '702' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.hazards).not.toBeNull()
    expect(data.hazards.signalWord).toBe('Danger')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/hazards/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns null hazards when not found', async () => {
    ;(pubchemHazards.getGhsHazardsByCid as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/hazards/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.hazards).toBeNull()
  })
})
