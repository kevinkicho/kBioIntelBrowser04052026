import { GET } from '@/app/api/alphafold/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as alphafold from '@/lib/api/alphafold'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/alphafold')

describe('GET /api/alphafold/[id]', () => {
  test('returns predictions for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(alphafold.getAlphaFoldPredictions as jest.Mock).mockResolvedValue([
      {
        entryId: 'AF-P12821-F1',
        uniprotAccession: 'P12821',
        geneName: 'ACE',
        organismName: 'Homo sapiens',
        confidenceScore: 92.5,
        modelUrl: 'https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif',
        url: 'https://alphafold.ebi.ac.uk/entry/P12821',
      },
    ])
    const req = new NextRequest('http://localhost/api/alphafold/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.alphaFoldPredictions).toHaveLength(1)
    expect(data.alphaFoldPredictions[0].entryId).toBe('AF-P12821-F1')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/alphafold/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty predictions when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/alphafold/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(data.alphaFoldPredictions).toEqual([])
  })

  test('returns empty predictions when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(alphafold.getAlphaFoldPredictions as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/alphafold/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.alphaFoldPredictions).toEqual([])
  })
})
