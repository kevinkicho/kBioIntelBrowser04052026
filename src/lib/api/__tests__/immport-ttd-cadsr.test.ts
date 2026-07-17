/**
 * Unit tests for newly enabled free public paths.
 * Network is mocked — no live calls in CI.
 */

jest.mock('../foodb', () => ({
  searchFooDB: jest.fn(async () => [
    {
      id: '1',
      name: 'Quercetin',
      description: 'flavonoid',
      formula: 'C15H10O7',
      inchi: '',
      inchiKey: 'REFJWTPEDVJJIY-UHFFFAOYSA-N',
      smiles: '',
      mass: 302,
      casRegistryNumber: '',
      foodSources: ['onion'],
      synonyms: [],
      url: 'https://foodb.ca/compounds/1',
    },
  ]),
}))

describe('enabled free sources (mocked network)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  test('ImmPort maps study hits', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () =>
        JSON.stringify({
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'SDY1',
                _source: {
                  study_accession: 'SDY1',
                  brief_title: 'Test study',
                  brief_description: 'Desc',
                  condition_or_disease: ['COVID-19'],
                  clinical_trial: 'Y',
                  actual_enrollment: 12,
                  arm_name: ['Arm A'],
                  research_focus: ['Vaccine Response'],
                },
              },
            ],
          },
        }),
    }) as unknown as typeof fetch

    const { fetchImmPortData } = await import('../niaid-immport')
    const res = await fetchImmPortData('aspirin')
    expect(res.data.studies).toHaveLength(1)
    expect(res.data.studies[0].studyId).toBe('SDY1')
    expect(res.data.studies[0].title).toContain('Test')
    expect(res.source).toBe('NIAID ImmPort')
  })

  test('NCI EVS maps concepts', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        total: 1,
        concepts: [
          {
            code: 'C287',
            name: 'Aspirin',
            terminology: 'ncit',
            version: '26.06e',
            conceptStatus: 'DEFAULT',
            active: true,
          },
        ],
      }),
    }) as unknown as typeof fetch

    const { fetchCadsrData } = await import('../nci-cadsr')
    const res = await fetchCadsrData('aspirin')
    expect(res.data.concepts).toHaveLength(1)
    expect(res.data.concepts[0].conceptId).toBe('C287')
    expect(res.data.concepts[0].preferredName).toBe('Aspirin')
  })

  test('TTD maps BioThings hits', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            _id: '1',
            association: { predicate: 'biolink:interacts_with', moa: 'inhibitor' },
            subject: {
              name: 'Aspirin',
              pubchem_compound: '2244',
              ttd_drug_id: 'D0GY5Z',
              type: 'biolink:SmallMolecule',
            },
            object: {
              name: 'COX-1',
              ttd_target_id: 'T123',
              target_type: 'successful target',
              type: 'biolink:Protein',
            },
          },
        ],
      }),
    }) as unknown as typeof fetch

    const { getTTDData } = await import('../ttd')
    const res = await getTTDData('aspirin')
    expect(res.drugs.length).toBeGreaterThan(0)
    expect(res.targets.length).toBeGreaterThan(0)
    expect(res.drugs[0].name).toBe('Aspirin')
  })

  test('DFDB/PhytoHub use FooDB substitute', async () => {
    const { searchDFDB } = await import('../dfdb')
    const { searchPhytoHub } = await import('../phytohub')
    const d = await searchDFDB('quercetin')
    const p = await searchPhytoHub('quercetin')
    expect(d[0]?.name).toBe('Quercetin')
    expect(p[0]?.name).toBe('Quercetin')
  })

  test('DISABLED_API_SOURCES is empty after enable', async () => {
    const { DISABLED_API_SOURCES, isApiSourceDisabled } = await import('../sourceAvailability')
    expect(Object.keys(DISABLED_API_SOURCES)).toHaveLength(0)
    expect(isApiSourceDisabled('ttd')).toBe(false)
    expect(isApiSourceDisabled('nci-cadsr')).toBe(false)
    expect(isApiSourceDisabled('niaid-immport')).toBe(false)
  })
})
