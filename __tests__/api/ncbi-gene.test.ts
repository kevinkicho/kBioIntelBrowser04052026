import { GET } from '@/app/api/ncbi-gene/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as ncbiGene from '@/lib/api/ncbi-gene'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/ncbi-gene')

describe('GET /api/ncbi-gene/[id]', () => {
  test('returns gene info for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(ncbiGene.getGeneInfoByName as jest.Mock).mockResolvedValue([
      {
        geneId: '1636',
        symbol: 'ACE',
        name: 'angiotensin I converting enzyme',
        summary: 'This gene encodes an enzyme...',
        chromosome: '17',
        organism: 'Homo sapiens',
        url: 'https://www.ncbi.nlm.nih.gov/gene/1636',
      },
    ])
    const req = new NextRequest('http://localhost/api/ncbi-gene/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.geneInfo).toHaveLength(1)
    expect(data.geneInfo[0].symbol).toBe('ACE')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/ncbi-gene/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty geneInfo when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/ncbi-gene/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.geneInfo).toEqual([])
  })
})
