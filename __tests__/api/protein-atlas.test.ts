import { GET } from '@/app/api/protein-atlas/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as proteinAtlas from '@/lib/api/protein-atlas'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/protein-atlas')

describe('GET /api/protein-atlas/[id]', () => {
  test('returns protein atlas entries for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(proteinAtlas.getProteinAtlasBySymbols as jest.Mock).mockResolvedValue([
      {
        gene: 'ACE',
        uniprotId: 'P12821',
        subcellularLocations: ['Cytoplasm'],
        url: 'https://www.proteinatlas.org/ACE',
      },
    ])
    const req = new NextRequest('http://localhost/api/protein-atlas/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinAtlasEntries).toHaveLength(1)
    expect(data.proteinAtlasEntries[0].gene).toBe('ACE')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/protein-atlas/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/protein-atlas/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinAtlasEntries).toEqual([])
  })

  test('returns empty array when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(proteinAtlas.getProteinAtlasBySymbols as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/protein-atlas/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.proteinAtlasEntries).toEqual([])
  })
})
