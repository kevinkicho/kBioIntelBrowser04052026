import { getTargetRelatedMolecules } from '@/lib/api/dgidb'

function mockDGIdbResponse(geneNodes: Array<{ name: string | null; interactions: Array<{ drug: { name: string; conceptId: string }; interactionTypes: Array<{ type: string }>; sources: Array<{ sourceDbName: string }> }> }>) {
  return {
    data: {
      genes: {
        nodes: geneNodes,
      },
    },
  }
}

describe('getTargetRelatedMolecules', () => {
  test('returns empty array for empty gene symbols', async () => {
    const result = await getTargetRelatedMolecules([], 'Aspirin')
    expect(result).toEqual([])
  })

  test('excludes the current drug from results', async () => {
    const response = mockDGIdbResponse([
      {
        name: 'BRCA1',
        interactions: [
          { drug: { name: 'Olaparib', conceptId: 'chembl:CID_44' }, interactionTypes: [{ type: 'inhibitor' }], sources: [{ sourceDbName: 'DGIdb' }] },
          { drug: { name: 'Aspirin', conceptId: 'chembl:CID_25' }, interactionTypes: [{ type: 'blocker' }], sources: [{ sourceDbName: 'DGIdb' }] },
        ],
      },
    ])

    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })

    const result = await getTargetRelatedMolecules(['BRCA1'], 'Aspirin')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Olaparib')
    expect(result[0].sharedTargets).toContain('BRCA1')

    global.fetch = origFetch
  })

  test('accumulates shared targets across multiple genes', async () => {
    const response = mockDGIdbResponse([
      {
        name: 'BRCA1',
        interactions: [
          { drug: { name: 'Olaparib', conceptId: 'c1' }, interactionTypes: [{ type: 'inhibitor' }], sources: [{ sourceDbName: 'DGIdb' }] },
        ],
      },
      {
        name: 'TP53',
        interactions: [
          { drug: { name: 'Olaparib', conceptId: 'c1' }, interactionTypes: [{ type: 'inhibitor' }], sources: [{ sourceDbName: 'DGIdb' }] },
          { drug: { name: 'Nutlin-3', conceptId: 'c2' }, interactionTypes: [{ type: 'agonist' }], sources: [{ sourceDbName: 'CIViC' }] },
        ],
      },
    ])

    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })

    const result = await getTargetRelatedMolecules(['BRCA1', 'TP53'], 'TestDrug')

    expect(result).toHaveLength(2)
    const olaparib = result.find(r => r.name === 'Olaparib')
    expect(olaparib?.sharedTargets).toEqual(expect.arrayContaining(['BRCA1', 'TP53']))
    expect(olaparib?.sharedTargets.length).toBe(2)

    const nutlin = result.find(r => r.name === 'Nutlin-3')
    expect(nutlin?.sharedTargets).toEqual(['TP53'])

    global.fetch = origFetch
  })

  test('sorts by shared target count descending', async () => {
    const response = mockDGIdbResponse([
      {
        name: 'BRCA1',
        interactions: [
          { drug: { name: 'DrugA', conceptId: 'c1' }, interactionTypes: [{ type: 'inhibitor' }], sources: [{ sourceDbName: 'DGIdb' }] },
          { drug: { name: 'DrugB', conceptId: 'c2' }, interactionTypes: [{ type: 'inhibitor' }], sources: [{ sourceDbName: 'DGIdb' }] },
        ],
      },
      {
        name: 'TP53',
        interactions: [
          { drug: { name: 'DrugB', conceptId: 'c2' }, interactionTypes: [{ type: 'agonist' }], sources: [{ sourceDbName: 'DGIdb' }] },
        ],
      },
    ])

    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })

    const result = await getTargetRelatedMolecules(['BRCA1', 'TP53'], 'TestDrug')

    expect(result[0].name).toBe('DrugB')
    expect(result[0].sharedTargets.length).toBe(2)
    expect(result[1].name).toBe('DrugA')
    expect(result[1].sharedTargets.length).toBe(1)

    global.fetch = origFetch
  })

  test('returns empty on GraphQL errors', async () => {
    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errors: [{ message: 'Something went wrong' }] }),
    })

    const result = await getTargetRelatedMolecules(['BRCA1'], 'Aspirin')
    expect(result).toEqual([])

    global.fetch = origFetch
  })

  test('returns empty on HTTP error', async () => {
    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await getTargetRelatedMolecules(['BRCA1'], 'Aspirin')
    expect(result).toEqual([])

    global.fetch = origFetch
  })

  test('skips genes with no name', async () => {
    const response = mockDGIdbResponse([
      {
        name: null,
        interactions: [
          { drug: { name: 'DrugA', conceptId: 'c1' }, interactionTypes: [], sources: [] },
        ],
      },
    ])

    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })

    const result = await getTargetRelatedMolecules(['BRCA1'], 'Aspirin')
    expect(result).toEqual([])

    global.fetch = origFetch
  })

  test('limits to top 8 gene symbols', async () => {
    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { genes: { nodes: [] } } }),
    })

    await getTargetRelatedMolecules(
      ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'],
      'TestDrug',
    )

    const callArgs = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callArgs.variables.names).toHaveLength(8)
    expect(callArgs.variables.names[0]).toBe('G1')
    expect(callArgs.variables.names[7]).toBe('G8')

    global.fetch = origFetch
  })

  test('uses GraphQL variables instead of string interpolation', async () => {
    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { genes: { nodes: [] } } }),
    })

    await getTargetRelatedMolecules(['BRCA1', 'TP53'], 'Aspirin')

    const callArgs = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callArgs.variables).toBeDefined()
    expect(callArgs.variables.names).toEqual(['BRCA1', 'TP53'])
    expect(callArgs.query).toContain('$names')

    global.fetch = origFetch
  })

  test('limits results to 8 drugs', async () => {
    const manyDrugs = Array.from({ length: 20 }, (_, i) => ({
      drug: { name: `Drug${i}`, conceptId: `c${i}` },
      interactionTypes: [{ type: 'inhibitor' }],
      sources: [{ sourceDbName: 'DGIdb' }],
    }))
    const response = mockDGIdbResponse([
      { name: 'BRCA1', interactions: manyDrugs },
    ])

    const origFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })

    const result = await getTargetRelatedMolecules(['BRCA1'], 'Aspirin')
    expect(result.length).toBeLessThanOrEqual(8)

    global.fetch = origFetch
  })
})

describe('SimilarMolecules response parsing', () => {
  test('handles new { structural, targetRelated } format', () => {
    const json = {
      structural: [{ cid: 2244, name: 'Aspirin', formula: 'C9H8O4', molecularWeight: 180, imageUrl: 'https://example.com/img' }],
      targetRelated: [{ name: 'Olaparib', sharedTargets: ['BRCA1'], interactionTypes: ['inhibitor'], sources: ['DGIdb'] }],
    }

    const isNewFormat = json && typeof json === 'object' && ('structural' in json || 'targetRelated' in json)
    expect(isNewFormat).toBe(true)
  })

  test('handles legacy array format (backward compat)', () => {
    const json = [
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4', molecularWeight: 180, imageUrl: 'https://example.com/img' },
    ]

    const isNewFormat = json && typeof json === 'object' && ('structural' in json || 'targetRelated' in json)
    const isArray = Array.isArray(json)
    expect(isNewFormat).toBe(false)
    expect(isArray).toBe(true)
  })

  test('handles null response gracefully', () => {
    const json = null
    const result = (json && typeof json === 'object' && ('structural' in json || 'targetRelated' in json))
      ? json
      : Array.isArray(json)
        ? json
        : null

    expect(result).toBeNull()
  })
})