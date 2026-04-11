import { GET } from '@/app/api/comptox/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as comptox from '@/lib/api/comptox'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/comptox')

describe('GET /api/comptox/[id]', () => {
  test('returns CompTox data for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(comptox.getCompToxByName as jest.Mock).mockResolvedValue({
      dtxsid: 'DTXSID7020182',
      casNumber: '50-78-2',
      toxcastActive: 42,
      toxcastTotal: 800,
      exposurePrediction: 'MEDIAN',
      url: 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182',
    })
    const req = new NextRequest('http://localhost/api/comptox/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.compToxData).not.toBeNull()
    expect(data.compToxData.dtxsid).toBe('DTXSID7020182')
    expect(data.compToxData.casNumber).toBe('50-78-2')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/comptox/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns null compToxData when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/comptox/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.compToxData).toBeNull()
  })

  test('returns null when CompTox client returns null', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(comptox.getCompToxByName as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/comptox/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(data.compToxData).toBeNull()
  })
})
