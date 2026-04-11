import { GET } from '@/app/api/ebi-proteins/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as ebiProteins from '@/lib/api/ebi-proteins'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/ebi-proteins')

describe('GET /api/ebi-proteins/[id]', () => {
  test('returns protein features for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(ebiProteins.getProteinFeaturesByAccessions as jest.Mock).mockResolvedValue([
      {
        type: 'ACTIVE_SITE',
        description: 'Zinc-binding',
        begin: 361,
        end: 361,
        evidences: ['ECO:0000269'],
        url: 'https://www.uniprot.org/uniprot/P12821#ACTIVE_SITE',
      },
    ])
    const req = new NextRequest('http://localhost/api/ebi-proteins/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinFeatures).toHaveLength(1)
    expect(data.proteinFeatures[0].type).toBe('ACTIVE_SITE')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/ebi-proteins/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/ebi-proteins/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinFeatures).toEqual([])
  })

  test('returns empty array when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(ebiProteins.getProteinFeaturesByAccessions as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/ebi-proteins/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.proteinFeatures).toEqual([])
  })
})
