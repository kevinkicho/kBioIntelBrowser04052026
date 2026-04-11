import { GET } from '@/app/api/interpro/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as uniprot from '@/lib/api/uniprot'
import * as interpro from '@/lib/api/interpro'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/uniprot')
jest.mock('@/lib/api/interpro')

describe('GET /api/interpro/[id]', () => {
  test('returns protein domains for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([
      { accession: 'P12821', proteinName: 'ACE', geneName: 'ACE', organism: 'Homo sapiens', functionSummary: '' },
    ])
    ;(interpro.getProteinDomains as jest.Mock).mockResolvedValue([
      {
        accession: 'IPR001548',
        name: 'Peptidase M2',
        type: 'Family',
        description: 'Peptidase M2',
        url: 'https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001548',
      },
    ])
    const req = new NextRequest('http://localhost/api/interpro/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinDomains).toHaveLength(1)
    expect(data.proteinDomains[0].accession).toBe('IPR001548')
    expect(data.proteinDomains[0].name).toBe('Peptidase M2')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/interpro/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty proteinDomains when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/interpro/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.proteinDomains).toEqual([])
  })

  test('returns empty proteinDomains when uniprot returns no entries', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5477, name: 'Lisinopril', synonyms: [] })
    ;(uniprot.getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    ;(interpro.getProteinDomains as jest.Mock).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/interpro/5477')
    const res = await GET(req, { params: { id: '5477' } })
    const data = await res.json()
    expect(data.proteinDomains).toEqual([])
  })
})
