import { getRobokopAsDrugCentral } from '@/lib/api/robokop'

// Mock global fetch
global.fetch = jest.fn()

describe('DrugCentral API (now using ROBOKOP compatibility layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch drug data successfully via ROBOKOP', async () => {
    // Mock ROBOKOP responses
    const mockResponse = {
      message: {
        knowledge_graph: {
          nodes: {
            'CHEBI:15365': {
              name: 'aspirin',
              categories: ['biolink:ChemicalEntity', 'biolink:Drug']
            },
            'MONDO:0005061': {
              name: 'migraine disorder',
              categories: ['biolink:Disease']
            }
          },
          edges: {}
        },
        results: [{ node_bindings: { chemical: [{ id: 'CHEBI:15365' }] } }]
      }
    }

    // Mock multiple fetch calls for search and queries
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

    const result = await getRobokopAsDrugCentral('aspirin')

    expect(fetch).toHaveBeenCalled()
    expect(result.drug).not.toBeNull()
    if (result.drug) {
      expect(result.drug.name).toBe('aspirin')
      expect(Array.isArray(result.drug.indication)).toBe(true)
    }
    expect(Array.isArray(result.targets)).toBe(true)
  })

  it('should return null when chemical not found', async () => {
    // Mock empty response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: {
          knowledge_graph: { nodes: {}, edges: {} },
          results: []
        }
      })
    })

    const result = await getRobokopAsDrugCentral('unknown-drug')
    expect(result.drug).toBeNull()
    expect(result.targets).toEqual([])
  })

  it('should return null on fetch failure', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const result = await getRobokopAsDrugCentral('aspirin')
    expect(result.drug).toBeNull()
    expect(result.targets).toEqual([])
  })

  it('should return null on exception', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const result = await getRobokopAsDrugCentral('aspirin')
    expect(result.drug).toBeNull()
    expect(result.targets).toEqual([])
  })
})
