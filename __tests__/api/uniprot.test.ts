import { GET } from '@/app/api/uniprot/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')

describe('GET /api/uniprot/[id]', () => {
  test('returns entries for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 5793,
      name: 'Glucose',
      synonyms: [],
    })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([{
      accession: 'P00734',
      proteinName: 'Prothrombin',
      geneName: 'F2',
      organism: 'Homo sapiens',
      functionSummary: 'Thrombin cleaves fibrinogen.',
    }])

    const req = new NextRequest('http://localhost/api/uniprot/5793')
    const res = await GET(req, { params: { id: '5793' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.entries).toHaveLength(1)
    expect(data.entries[0].accession).toBe('P00734')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/uniprot/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty entries array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/uniprot/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.entries).toEqual([])
  })
})
