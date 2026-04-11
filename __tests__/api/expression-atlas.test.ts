import { GET } from '@/app/api/expression-atlas/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as expressionAtlas from '@/lib/api/expression-atlas'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/expression-atlas')

describe('GET /api/expression-atlas/[id]', () => {
  test('returns gene expressions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(expressionAtlas.getGeneExpressionBySymbols as jest.Mock).mockResolvedValue([
      {
        experimentId: 'E-MTAB-123',
        experimentDescription: 'Baseline expression in tissues',
        species: 'Homo sapiens',
        experimentType: 'RNASEQ_MRNA_BASELINE',
        url: 'https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123',
      },
    ])
    const req = new NextRequest('http://localhost/api/expression-atlas/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.geneExpressions).toHaveLength(1)
    expect(data.geneExpressions[0].experimentId).toBe('E-MTAB-123')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/expression-atlas/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty geneExpressions when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/expression-atlas/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.geneExpressions).toEqual([])
  })

  test('returns empty geneExpressions when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(expressionAtlas.getGeneExpressionBySymbols as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/expression-atlas/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.geneExpressions).toEqual([])
  })
})
