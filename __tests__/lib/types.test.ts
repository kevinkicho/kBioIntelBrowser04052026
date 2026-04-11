// Type-level tests — verify the shapes compile correctly
import type { Molecule, CompanyProduct, SynthesisRoute, GraphNode, GraphEdge, SearchResult } from '@/lib/types'

test('Molecule type has required fields', () => {
  const m: Molecule = {
    cid: 5793,
    name: 'Glucose',
    formula: 'C6H12O6',
    iupacName: 'D-glucose',
    molecularWeight: 180.16,
    classification: 'metabolite',
    synonyms: ['Dextrose', 'Blood sugar'],
    inchiKey: 'WQZGKKKJIJFFOK-GASJEMHNSA-N',
    structureImageUrl: 'https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5793&t=l',
  }
  expect(m.cid).toBe(5793)
  expect(m.classification).toBe('metabolite')
})

test('SearchResult type has required fields', () => {
  const r: SearchResult = { cid: 5793, name: 'Glucose', formula: 'C6H12O6' }
  expect(r.cid).toBe(5793)
})

test('GraphNode and GraphEdge types compile', () => {
  const node: GraphNode = { id: 'mol-5793', label: 'Glucose', type: 'molecule', data: {} }
  const edge: GraphEdge = { source: 'mol-5793', target: 'co-novo', label: 'manufactured by' }
  expect(node.type).toBe('molecule')
  expect(edge.label).toBe('manufactured by')
})
