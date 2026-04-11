import { buildGraphData } from '@/lib/buildGraphData'
import type { Molecule, CompanyProduct, SynthesisRoute, Patent, UniprotEntry } from '@/lib/types'

const molecule: Molecule = {
  cid: 5793, name: 'Glucose', formula: 'C6H12O6', iupacName: 'D-glucose',
  molecularWeight: 180.16, classification: 'metabolite', synonyms: [],
  inchiKey: 'WQZGKKKJIJFFOK-GASJEMHNSA-N',
  structureImageUrl: '',
}

const companies: CompanyProduct[] = [{
  company: 'Pfizer', brandName: 'TestDrug', genericName: 'GLUCOSE',
  productType: 'HUMAN PRESCRIPTION DRUG', route: 'ORAL',
  applicationNumber: 'NDA12345',
}]

const routes: SynthesisRoute[] = [{
  method: 'Glycolysis', description: 'ATP + D-Glucose => ADP + D-Glucose-6P',
  keggReactionIds: ['R00010'], enzymesInvolved: ['hexokinase'], precursors: [], source: 'kegg',
}]

const patents: Patent[] = [{
  id: 'PAT001',
  patentNumber: 'US8114833',
  title: 'GLP-1 receptor agonists',
  filingDate: '2012-02-14',
  publicationDate: '2013-02-14',
  expirationDate: '2032-02-14',
  status: 'Active',
  assignee: 'Novo Nordisk',
  abstract: 'A compound useful for treating diabetes.',
}]

const genes: UniprotEntry[] = [{
  accession: 'P00734',
  proteinName: 'Prothrombin',
  geneName: 'F2',
  organism: 'Homo sapiens',
  functionSummary: 'Thrombin cleaves fibrinogen to form fibrin.',
}]

describe('buildGraphData', () => {
  test('always includes the central molecule node', () => {
    const graph = buildGraphData(molecule, [], [], [], [])
    expect(graph.nodes.find(n => n.type === 'molecule')).toBeDefined()
    expect(graph.nodes[0].label).toBe('Glucose')
  })

  test('adds company nodes and edges', () => {
    const graph = buildGraphData(molecule, companies, [], [], [])
    expect(graph.nodes.find(n => n.type === 'company')).toBeDefined()
    expect(graph.edges.find(e => e.label === 'manufactured by')).toBeDefined()
  })

  test('adds synthesis nodes and edges', () => {
    const graph = buildGraphData(molecule, [], routes, [], [])
    expect(graph.nodes.find(n => n.type === 'synthesis')).toBeDefined()
    expect(graph.edges.find(e => e.label === 'synthesized via')).toBeDefined()
  })

  test('adds patent nodes and edges', () => {
    const graph = buildGraphData(molecule, [], [], patents, [])
    const patentNode = graph.nodes.find(n => n.type === 'patent')
    expect(patentNode).toBeDefined()
    expect(patentNode?.label).toBe('US8114833')
    expect(patentNode?.data?.assignee).toBe('Novo Nordisk')
    expect(graph.edges.find(e => e.label === 'patented by')).toBeDefined()
  })

  test('adds gene nodes and edges', () => {
    const graph = buildGraphData(molecule, [], [], [], genes)
    const geneNode = graph.nodes.find(n => n.type === 'gene')
    expect(geneNode).toBeDefined()
    expect(geneNode?.label).toBe('F2')
    expect(geneNode?.data?.proteinName).toBe('Prothrombin')
    expect(graph.edges.find(e => e.label === 'targets')).toBeDefined()
  })

  test('returns valid node ids with no duplicates', () => {
    const graph = buildGraphData(molecule, companies, routes, patents, genes)
    const ids = graph.nodes.map(n => n.id)
    const unique = new Set(ids)
    expect(ids.length).toBe(unique.size)
  })

  test('does not add patent nodes when patents array is empty', () => {
    const graph = buildGraphData(molecule, [], [], [], [])
    expect(graph.nodes.filter(n => n.type === 'patent')).toHaveLength(0)
  })

  test('does not add gene nodes when genes array is empty', () => {
    const graph = buildGraphData(molecule, [], [], [], [])
    expect(graph.nodes.filter(n => n.type === 'gene')).toHaveLength(0)
  })

  test('uses protein name as label when gene name is empty', () => {
    const noGene: UniprotEntry[] = [{
      accession: 'Q12345', proteinName: 'Some Protein', geneName: '',
      organism: 'Homo sapiens', functionSummary: '',
    }]
    const graph = buildGraphData(molecule, [], [], [], noGene)
    const geneNode = graph.nodes.find(n => n.type === 'gene')
    expect(geneNode?.label).toBe('Some Protein')
  })
})
