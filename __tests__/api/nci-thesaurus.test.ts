import { GET } from '@/app/api/nci-thesaurus/[id]/route'
import { NextRequest } from 'next/server'
import * as pubchem from '@/lib/api/pubchem'
import * as nciThesaurus from '@/lib/api/nci-thesaurus'

jest.mock('@/lib/api/pubchem')
jest.mock('@/lib/api/nci-thesaurus')

describe('GET /api/nci-thesaurus/[id]', () => {
  test('returns concepts for a valid CID', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue({
      cid: 2244,
      name: 'Aspirin',
      synonyms: [],
    })
    ;(nciThesaurus.getNciConceptsByName as jest.Mock).mockResolvedValue([{
      code: 'C61948',
      name: 'Aspirin',
      terminology: 'ncit',
      conceptStatus: 'Retired_Concept',
      leaf: true,
      url: 'https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=C61948',
    }])

    const req = new NextRequest('http://localhost/api/nci-thesaurus/2244')
    const res = await GET(req, { params: { id: '2244' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.nciConcepts).toHaveLength(1)
    expect(data.nciConcepts[0].code).toBe('C61948')
  })

  test('returns 400 for non-numeric id', async () => {
    const req = new NextRequest('http://localhost/api/nci-thesaurus/bad')
    const res = await GET(req, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  test('returns empty array when molecule not found', async () => {
    ;(pubchem.getMoleculeById as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/nci-thesaurus/9999999')
    const res = await GET(req, { params: { id: '9999999' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.nciConcepts).toEqual([])
  })
})
