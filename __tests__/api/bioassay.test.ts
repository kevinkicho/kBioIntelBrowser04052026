import { GET } from '@/app/api/bioassay/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as bioassay from '@/lib/api/bioassay'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/bioassay')

describe('GET /api/bioassay/[id]', () => {
  test('returns bioassays for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 2244, name: 'Aspirin', synonyms: [] })
    ;(bioassay.getBioAssaysByName as jest.Mock).mockResolvedValue([
      {
        aid: 12345,
        assayName: 'Cytotoxicity assay',
        outcome: 'Active',
        activityValue: 5.2,
        targetName: 'EGFR',
        url: 'https://pubchem.ncbi.nlm.nih.gov/bioassay/12345',
      },
    ])
    const req = new NextRequest('http://localhost/api/bioassay/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.bioAssays).toHaveLength(1)
    expect(data.bioAssays[0].aid).toBe(12345)
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/bioassay/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty bioAssays when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/bioassay/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.bioAssays).toEqual([])
  })
})
