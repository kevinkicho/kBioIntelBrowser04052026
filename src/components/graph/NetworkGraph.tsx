'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode } from '@/lib/types'
import { useRouter } from 'next/navigation'
import {
  formatProvenanceTimestamp,
  resolveProvenance,
} from '@/lib/provenance'

const NODE_COLORS: Record<GraphNode['type'], string> = {
  molecule: '#6366f1',   // indigo
  company:  '#10b981',   // emerald
  synthesis:'#f59e0b',   // amber
  gene:     '#8b5cf6',   // purple
  product:  '#ef4444',   // red
  patent:   '#06b6d4',   // cyan
  target:   '#14b8a6',   // teal
  trial:    '#f97316',   // orange
  pathway:  '#ec4899',   // pink
  publication: '#64748b', // slate
  grant:    '#84cc16',   // lime
}

/** Default free-public source key by graph node type */
const TYPE_SOURCE: Partial<Record<GraphNode['type'], string>> = {
  molecule: 'pubchem',
  company: 'openfda',
  patent: 'patents',
  trial: 'clinicaltrials',
  target: 'opentargets',
  pathway: 'reactome',
  gene: 'ncbi-gene',
  product: 'fda-ndc',
  publication: 'pubmed',
  grant: 'nihreporter',
  synthesis: 'synthesis',
}

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  label: string
}

interface SelectedNodeInfo {
  node: GraphNode
  clientX: number
  clientY: number
}

export function NetworkGraph({
  data,
  fetchedAt,
}: {
  data: GraphData
  fetchedAt?: Date | string | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const router = useRouter()
  const [selected, setSelected] = useState<SelectedNodeInfo | null>(null)

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 500

    const nodes: SimNode[] = data.nodes.map(n => ({ ...n }))
    const nodeById = new Map(nodes.map(n => [n.id, n]))

    const links: SimEdge[] = data.edges
      .map(e => ({
        source: nodeById.get(e.source as string)!,
        target: nodeById.get(e.target as string)!,
        label: e.label ?? '',
      }))
      .filter(e => e.source && e.target)

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as SimNode).id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    const g = svg.append('g')

    // Zoom & pan
    svg.call(d3.zoom<SVGSVGElement, unknown>().on('zoom', e => g.attr('transform', e.transform)))

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5)

    // Edge labels
    const edgeLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', '#64748b')
      .attr('font-size', 10)
      .attr('text-anchor', 'middle')
      .text(d => d.label)

    // Nodes
    const nodeSelection = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle') as d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown>

    nodeSelection
      .attr('r', d => d.type === 'molecule' ? 28 : 18)
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => NODE_COLORS[d.type])
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGCircleElement, SimNode>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelected({
          node: d,
          clientX: event.clientX,
          clientY: event.clientY,
        })
      })
      .on('dblclick', (_event, d) => {
        if (d.type === 'molecule') router.push(`/molecule/${d.id.replace('mol-', '')}`)
        if (d.type === 'gene') {
          const gid = String(d.data?.geneId || d.id.replace('gene-', ''))
          if (gid) router.push(`/gene/${gid}`)
        }
      })

    const node = nodeSelection

    // Node labels
    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('fill', '#e2e8f0')
      .attr('font-size', 11)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'molecule' ? 42 : 30)
      .text(d => d.label.length > 20 ? d.label.slice(0, 18) + '…' : d.label)

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      edgeLabel
        .attr('x', d => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr('y', d => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2)

      node.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      label.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)
    })

    return () => { simulation.stop() }
  }, [data, router])

  const provenance = selected
    ? resolveProvenance(
        String(selected.node.data?.sourceKey || TYPE_SOURCE[selected.node.type] || selected.node.type),
        {
          recordUrl: typeof selected.node.data?.url === 'string' ? selected.node.data.url : undefined,
          fetchedAt: fetchedAt ?? (typeof selected.node.data?.fetchedAt === 'string' ? selected.node.data.fetchedAt : null),
        },
      )
    : null

  return (
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden" style={{ height: '520px' }}>
      <svg ref={svgRef} width="100%" height="100%" />
      <p className="absolute top-3 left-3 text-[10px] text-slate-500 pointer-events-none">
        Click a node for API provenance · double-click to open molecule/gene
      </p>
      <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 text-xs pointer-events-none">
        {(Object.entries(NODE_COLORS) as [GraphNode['type'], string][]).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {type}
          </span>
        ))}
      </div>

      {selected && provenance && (
        <div
          className="fixed z-[300] w-80 max-w-[90vw] rounded-lg border border-slate-600 bg-[#12141c] shadow-xl p-3"
          style={{
            left: Math.min(selected.clientX, typeof window !== 'undefined' ? window.innerWidth - 340 : selected.clientX),
            top: Math.min(selected.clientY + 12, typeof window !== 'undefined' ? window.innerHeight - 280 : selected.clientY),
          }}
          role="dialog"
          aria-label={`Provenance for ${selected.node.label}`}
          data-testid="graph-node-provenance"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">API provenance</p>
              <p className="text-xs font-semibold text-slate-100 truncate">{selected.node.label}</p>
              <p className="text-[10px] text-slate-500 capitalize">{selected.node.type}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded p-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <dl className="space-y-1.5 text-[11px]">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-[10px] text-slate-500">Source</dt>
              <dd className="text-slate-300">{provenance.organization}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-[10px] text-slate-500">API</dt>
              <dd className="font-mono text-[10px] text-slate-300">{provenance.api}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-[10px] text-slate-500">Fetched</dt>
              <dd className="font-mono text-[10px] text-slate-300">
                {formatProvenanceTimestamp(provenance.fetchedAt)}
              </dd>
            </div>
            {provenance.endpoint && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-[10px] text-slate-500">Endpoint</dt>
                <dd className="min-w-0">
                  <a
                    href={provenance.endpoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-[10px] text-cyan-400/90 hover:text-cyan-300"
                  >
                    {provenance.endpoint}
                  </a>
                </dd>
              </div>
            )}
            {provenance.docs && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-[10px] text-slate-500">Docs</dt>
                <dd className="min-w-0">
                  <a
                    href={provenance.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    {provenance.docs}
                  </a>
                </dd>
              </div>
            )}
            {provenance.recordUrl && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-[10px] text-slate-500">Record</dt>
                <dd className="min-w-0">
                  <a
                    href={provenance.recordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-[10px] text-cyan-400/90 hover:text-cyan-300"
                  >
                    {provenance.recordUrl}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-[9px] text-slate-600">
            Free public source — verify upstream yourself. Double-click molecule/gene nodes to open.
          </p>
        </div>
      )}
    </div>
  )
}
