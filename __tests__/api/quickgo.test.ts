import { GET } from '@/app/api/quickgo/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as quickgo from '@/lib/api/quickgo'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/quickgo')

describe('GET /api/quickgo/[id]', () => {
  test('returns GO annotations for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(quickgo.getGoAnnotationsByAccessions as jest.Mock).mockResolvedValue([
      {
        goId: 'GO:0004180',
        goName: 'carboxypeptidase activity',
        goAspect: 'molecular_function',
        evidence: 'IDA',
        qualifier: 'enables',
        url: 'https://www.ebi.ac.uk/QuickGO/term/GO:0004180',
      },
    ])
    const req = new NextRequest('http://localhost/api/quickgo/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.goAnnotations).toHaveLength(1)
    expect(data.goAnnotations[0].goId).toBe('GO:0004180')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/quickgo/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/quickgo/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.goAnnotations).toEqual([])
  })

  test('returns empty array when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(quickgo.getGoAnnotationsByAccessions as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/quickgo/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.goAnnotations).toEqual([])
  })
})
