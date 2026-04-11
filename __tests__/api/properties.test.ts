import { GET } from '@/app/api/properties/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchemProperties from '@/lib/api/pubchem-properties'

jest.mock('@/lib/api/pubchem-properties')

describe('GET /api/properties/[id]', () => {
  test('returns properties for a valid CID', async () => {
    ;(pubchemProperties.getComputedPropertiesByCid as jest.Mock).mockResolvedValue({
      xLogP: 1.2, tpsa: 63.6, hBondDonorCount: 1, hBondAcceptorCount: 4,
      complexity: 212, exactMass: 180.042, charge: 0, rotatableBondCount: 3,
    })

    const req = new NextRequest('http://localhost/api/properties/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.properties).not.toBeNull()
    expect(data.properties.xLogP).toBe(1.2)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/properties/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns null properties when not found', async () => {
    ;(pubchemProperties.getComputedPropertiesByCid as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/properties/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.properties).toBeNull()
  })
})
