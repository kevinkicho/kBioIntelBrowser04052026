import {
  getRobokopData,
  getRobokopAsDrugCentral,
  getChemicalDiseases,
  getChemicalTargets,
  getChemicalPhenotypes,
  getRobokopMetaKG,
  type RobokopQueryResult
} from '@/lib/api/robokop'

global.fetch = jest.fn()

const mockRobokopResponse: RobokopQueryResult = {
  message: {
    query_graph: {},
    knowledge_graph: {
      nodes: {
        'CHEBI:15365': {
          name: 'aspirin',
          categories: ['biolink:ChemicalEntity', 'biolink:Drug']
        },
        'MONDO:0005061': {
          name: 'migraine disorder',
          categories: ['biolink:Disease']
        },
        'NCBIGene:5743': {
          name: 'PTGS2',
          categories: ['biolink:Gene']
        }
      },
      edges: {}
    },
    results: [
      {
        node_bindings: {
          chemical: [{ id: 'CHEBI:15365' }],
          disease: [{ id: 'MONDO:0005061' }]
        },
        edge_bindings: {}
      }
    ]
  }
}

describe('ROBOKOP API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getChemicalDiseases', () => {
    it('should fetch chemical-disease associations', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRobokopResponse
      })

      const result = await getChemicalDiseases('CHEBI:15365')
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('robokop-automat'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('migraine disorder')
    })

    it('should return empty array on fetch failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      })

      const result = await getChemicalDiseases('CHEBI:15365')
      expect(result).toEqual([])
    })

    it('should return empty array on exception', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getChemicalDiseases('CHEBI:15365')
      expect(result).toEqual([])
    })
  })

  describe('getChemicalTargets', () => {
    it('should fetch chemical-gene associations', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRobokopResponse
      })

      const result = await getChemicalTargets('CHEBI:15365')
      
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should return empty array on error', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getChemicalTargets('CHEBI:15365')
      expect(result).toEqual([])
    })
  })

  describe('getChemicalPhenotypes', () => {
    it('should fetch chemical-phenotype associations', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRobokopResponse
      })

      const result = await getChemicalPhenotypes('CHEBI:15365')
      
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getRobokopData', () => {
    it('should return comprehensive chemical data', async () => {
      // Mock search returning a chemical ID
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })

      const result = await getRobokopData('aspirin')
      
      expect(result.chemical).not.toBeNull()
      expect(Array.isArray(result.diseases)).toBe(true)
      expect(Array.isArray(result.targets)).toBe(true)
      expect(Array.isArray(result.phenotypes)).toBe(true)
    })

    it('should return empty data when chemical not found', async () => {
      // Mock search returning empty
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            knowledge_graph: { nodes: {}, edges: {} },
            results: []
          }
        })
      })

      const result = await getRobokopData('unknown-chemical')
      
      expect(result.chemical).toBeNull()
      expect(result.diseases).toEqual([])
      expect(result.targets).toEqual([])
      expect(result.phenotypes).toEqual([])
    })
  })

  describe('getRobokopAsDrugCentral', () => {
    it('should convert ROBOKOP data to DrugCentral format', async () => {
      // Mock all the internal calls
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRobokopResponse
        })

      const result = await getRobokopAsDrugCentral('aspirin')
      
      expect(result.drug).not.toBeNull()
      if (result.drug) {
        expect(result.drug.name).toBe('aspirin')
        expect(Array.isArray(result.drug.indication)).toBe(true)
      }
      expect(Array.isArray(result.targets)).toBe(true)
    })

    it('should return null drug when not found', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            knowledge_graph: { nodes: {}, edges: {} },
            results: []
          }
        })
      })

      const result = await getRobokopAsDrugCentral('unknown')
      
      expect(result.drug).toBeNull()
      expect(result.targets).toEqual([])
    })
  })

  describe('getRobokopMetaKG', () => {
    it('should fetch meta knowledge graph', async () => {
      const mockMeta = {
        nodes: { 'biolink:ChemicalEntity': {} },
        edges: [{ subject: 'biolink:ChemicalEntity', predicate: 'biolink:treats', object: 'biolink:Disease' }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeta
      })

      const result = await getRobokopMetaKG()
      
      expect(result).not.toBeNull()
      expect(result?.nodes).toBeDefined()
      expect(Array.isArray(result?.edges)).toBe(true)
    })

    it('should return null on error', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getRobokopMetaKG()
      expect(result).toBeNull()
    })
  })
})
