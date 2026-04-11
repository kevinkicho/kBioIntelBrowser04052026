'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode } from '@/lib/types'
import { useRouter } from 'next/navigation'

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

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  label: string
}

export function NetworkGraph({ data }: { data: GraphData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const router = useRouter()

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
      .on('click', (_event, d) => {
        if (d.type === 'molecule') router.push(`/molecule/${d.id.replace('mol-', '')}`)
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

  return (
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden" style={{ height: '520px' }}>
      <svg ref={svgRef} width="100%" height="100%" />
      <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 text-xs pointer-events-none">
        {(Object.entries(NODE_COLORS) as [GraphNode['type'], string][]).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  )
}
