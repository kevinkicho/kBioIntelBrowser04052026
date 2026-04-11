'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ReactomePathway } from '@/lib/types'

interface Props {
  pathways: ReactomePathway[]
  moleculeName: string
}

interface Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: 'molecule' | 'pathway'
  color: string
}

interface Link {
  source: string | Node
  target: string | Node
}

export function PathwayMiniGraph({ pathways, moleculeName }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || pathways.length === 0) return

    const width = 600
    const height = 400
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Data prep: Center molecule + spoke pathways
    const nodes: Node[] = [
      { id: 'molecule', name: moleculeName, type: 'molecule', color: '#818cf8' },
      ...pathways.map((p, i) => ({
        id: `pathway-${i}`,
        name: p.name,
        type: 'pathway' as const,
        color: '#a78bfa'
      }))
    ]

    const links: Link[] = pathways.map((_, i) => ({
      source: 'molecule',
      target: `pathway-${i}`
    }))

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))

    const g = svg.append('g')

    // Add zoom
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => g.attr('transform', event.transform)))

    const linkLines = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const nodeGroups: any = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    nodeGroups.append('circle')
      .attr('r', (d: Node) => d.type === 'molecule' ? 24 : 12)
      .attr('fill', (d: Node) => d.color)
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2)
      .attr('class', 'filter drop-shadow-lg')

    // Labels
    nodeGroups.append('text')
      .text((d: Node) => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name)
      .attr('dx', 30)
      .attr('dy', 5)
      .attr('fill', '#94a3b8')
      .attr('font-size', (d: Node) => d.type === 'molecule' ? '12px' : '10px')
      .attr('font-weight', (d: Node) => d.type === 'molecule' ? '600' : '400')
      .attr('class', 'pointer-events-none select-none')

    simulation.on('tick', () => {
      linkLines
        .attr('x1', (d: Link) => (d.source as Node).x ?? 0)
        .attr('y1', (d: Link) => (d.source as Node).y ?? 0)
        .attr('x2', (d: Link) => (d.target as Node).x ?? 0)
        .attr('y2', (d: Link) => (d.target as Node).y ?? 0)

      nodeGroups.attr('transform', (d: Node) => `translate(${d.x},${d.y})`)
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x; d.fy = d.y
    }
    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x; d.fy = event.y
    }
    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null; d.fy = null
    }

    return () => { simulation.stop() }
  }, [pathways, moleculeName])

  return (
    <div className="w-full h-[400px] bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing">
      <div className="absolute top-4 left-4 z-10">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
          Interactive Process Map
        </span>
      </div>
      <svg 
        ref={svgRef} 
        viewBox="0 0 600 400" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      />
      <div className="absolute bottom-4 right-4 text-[9px] text-slate-600 flex gap-3">
        <span>🖱️ Drag to pan</span>
        <span>🔍 Scroll to zoom</span>
      </div>
    </div>
  )
}
