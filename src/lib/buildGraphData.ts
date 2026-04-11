import type { Molecule, CompanyProduct, SynthesisRoute, Patent, UniprotEntry, GraphData, GraphNode, GraphEdge } from './types'

export function buildGraphData(
  molecule: Molecule,
  companies: CompanyProduct[],
  routes: SynthesisRoute[],
  patents: Patent[],
  genes: UniprotEntry[]
): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const moleculeNodeId = `mol-${molecule.cid}`

  nodes.push({
    id: moleculeNodeId,
    label: molecule.name,
    type: 'molecule',
    data: { cid: molecule.cid, formula: molecule.formula },
  })

  // Company nodes
  const seenCompanies = new Set<string>()
  for (const product of companies) {
    const companyId = `co-${product.company.toLowerCase().replace(/\s+/g, '-')}`
    if (!seenCompanies.has(companyId)) {
      seenCompanies.add(companyId)
      nodes.push({
        id: companyId,
        label: product.company,
        type: 'company',
        data: { brandName: product.brandName, route: product.route },
      })
      edges.push({ source: moleculeNodeId, target: companyId, label: 'manufactured by' })
    }
  }

  // Synthesis route nodes
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    const routeId = `syn-${i}-${route.source}`
    nodes.push({
      id: routeId,
      label: route.method.length > 25 ? route.method.slice(0, 23) + '…' : route.method,
      type: 'synthesis',
      data: { description: route.description, enzymes: route.enzymesInvolved },
    })
    edges.push({ source: moleculeNodeId, target: routeId, label: 'synthesized via' })
  }

  // Patent nodes
  for (const patent of patents) {
    const patentId = `pat-${patent.patentNumber}`
    nodes.push({
      id: patentId,
      label: patent.patentNumber,
      type: 'patent',
      data: { title: patent.title, assignee: patent.assignee, filingDate: patent.filingDate },
    })
    edges.push({ source: moleculeNodeId, target: patentId, label: 'patented by' })
  }

  // Gene/protein nodes
  for (const gene of genes) {
    const geneId = `gene-${gene.accession}`
    nodes.push({
      id: geneId,
      label: gene.geneName || gene.proteinName,
      type: 'gene',
      data: { proteinName: gene.proteinName, organism: gene.organism, accession: gene.accession },
    })
    edges.push({ source: moleculeNodeId, target: geneId, label: 'targets' })
  }

  return { nodes, edges }
}
