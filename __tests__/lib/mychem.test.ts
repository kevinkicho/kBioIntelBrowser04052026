import {
  getMyChemData,
  mapMyChemHit,
  mychemChemUrl,
  mychemDeepLinks,
  searchChemicals,
} from '@/lib/api/mychem'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('mapMyChemHit', () => {
  test('extracts names and IDs from nested chembl/chebi/pubchem', () => {
    const mapped = mapMyChemHit({
      _id: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      chembl: {
        molecule_chembl_id: 'CHEMBL25',
        pref_name: 'ASPIRIN',
        max_phase: 4,
      },
      chebi: { id: 'CHEBI:15365', name: 'acetylsalicylic acid', formula: 'C9H8O4', mass: 180.16 },
      drugbank: { id: 'DB00945', name: 'Acetylsalicylic acid', groups: ['approved'] },
      pubchem: { cid: 2244 },
    })
    expect(mapped).not.toBeNull()
    expect(mapped!.name).toBe('ASPIRIN')
    expect(mapped!.chemblId).toBe('CHEMBL25')
    expect(mapped!.pubchemCid).toBe('2244')
    expect(mapped!.chebiId).toBe('CHEBI:15365')
    expect(mapped!.drugbankId).toBe('DB00945')
    expect(mapped!.formula).toBe('C9H8O4')
    expect(mapped!.inchiKey).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
    expect(mapped!.url).toContain('mychem.info/v1/chem/BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
  })

  test('drops pure NDC package hits without chemical sources', () => {
    const mapped = mapMyChemHit({
      _id: '66715-6526',
      ndc: { proprietaryname: 'BAYER Aspirin', nonproprietaryname: 'ASPIRIN' },
    })
    expect(mapped).toBeNull()
  })

  test('handles pubchem as array', () => {
    const mapped = mapMyChemHit({
      _id: 'ABC',
      chembl: { molecule_chembl_id: 'CHEMBL1', pref_name: 'TEST' },
      pubchem: [{ cid: 99 }, { cid: 100 }],
    })
    expect(mapped!.pubchemCid).toBe('99')
  })
})

describe('mychemDeepLinks', () => {
  test('builds target DB deep links', () => {
    const links = mychemDeepLinks({
      chemblId: 'CHEMBL25',
      pubchemCid: '2244',
      chebiId: 'CHEBI:15365',
      drugbankId: 'DB00945',
      inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    })
    expect(links.chembl).toContain('explore/compound/CHEMBL25')
    expect(links.pubchem).toContain('pubchem.ncbi.nlm.nih.gov/compound/2244')
    expect(links.mychem).toBe(mychemChemUrl('BSYNRYMUTXBXSQ-UHFFFAOYSA-N'))
  })
})

describe('searchChemicals', () => {
  test('parallel fielded search returns first non-empty hits', async () => {
    // All fielded queries fire in parallel; any non-empty wins
    ;(fetch as jest.Mock).mockImplementation(async (url: string) => {
      const u = decodeURIComponent(String(url))
      if (u.includes('chembl.pref_name')) {
        return {
          ok: true,
          json: async () => ({
            hits: [
              {
                _id: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
                chembl: { molecule_chembl_id: 'CHEMBL25', pref_name: 'ASPIRIN', max_phase: 4 },
                pubchem: { cid: 2244 },
              },
            ],
          }),
        }
      }
      return { ok: true, json: async () => ({ hits: [] }) }
    })
    const results = await searchChemicals('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('ASPIRIN')
    expect(results[0].name).not.toBe('Unknown compound')
    const urls = (fetch as jest.Mock).mock.calls.map((c: unknown[]) =>
      decodeURIComponent(String(c[0])),
    )
    expect(urls.some((u: string) => u.includes('chembl.pref_name'))).toBe(true)
  })
})

describe('getMyChemData', () => {
  test('prefers /chem/{cid} annotation when cid provided', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _id: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        chembl: { molecule_chembl_id: 'CHEMBL25', pref_name: 'ASPIRIN' },
        pubchem: { cid: 2244 },
        chebi: { id: 'CHEBI:15365', name: 'acetylsalicylic acid' },
      }),
    })
    const { chemicals } = await getMyChemData('aspirin', { cid: 2244 })
    expect(chemicals[0].name).toBe('ASPIRIN')
    expect(String((fetch as jest.Mock).mock.calls[0][0])).toContain('/chem/2244')
  })

  test('stops after first successful identity hit (no multi-ID fanout)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _id: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        chembl: { molecule_chembl_id: 'CHEMBL25', pref_name: 'ASPIRIN' },
        pubchem: { cid: 2244 },
      }),
    })
    const { chemicals } = await getMyChemData('aspirin', {
      inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      chemblId: 'CHEMBL25',
      cid: 2244,
    })
    expect(chemicals).toHaveLength(1)
    // Only one annotation call — InChIKey wins, chembl/cid not fetched
    expect((fetch as jest.Mock).mock.calls).toHaveLength(1)
    expect(String((fetch as jest.Mock).mock.calls[0][0])).toContain(
      'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    )
  })
})
