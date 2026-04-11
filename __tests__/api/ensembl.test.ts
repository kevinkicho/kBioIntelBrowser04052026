import { GET } from '@/app/api/ensembl/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as ensembl from '@/lib/api/ensembl'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/ensembl')

describe('GET /api/ensembl/[id]', () => {
  test('returns ensembl genes for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(ensembl.getEnsemblGenesBySymbols as jest.Mock).mockResolvedValue([
      {
        geneId: 'ENSG00000159640',
        displayName: 'ACE',
        description: 'angiotensin I converting enzyme',
        biotype: 'protein_coding',
        chromosome: '17',
        start: 63477061,
        end: 63498380,
        strand: -1,
        url: 'https://ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000159640',
      },
    ])
    const req = new NextRequest('http://localhost/api/ensembl/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ensemblGenes).toHaveLength(1)
    expect(data.ensemblGenes[0].geneId).toBe('ENSG00000159640')
    expect(data.ensemblGenes[0].displayName).toBe('ACE')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/ensembl/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty ensemblGenes when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/ensembl/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ensemblGenes).toEqual([])
  })

  test('returns empty ensemblGenes when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(ensembl.getEnsemblGenesBySymbols as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/ensembl/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.ensemblGenes).toEqual([])
  })
})
