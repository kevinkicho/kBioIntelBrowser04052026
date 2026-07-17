import { notFound, redirect } from 'next/navigation'
import { getGeneById, searchGenes } from '@/lib/api/mygene'
import { GeneDetailPageClient } from './GeneDetailPageClient'

function normalizeAliases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/**
 * /gene/[id] accepts:
 * - Canonical `{entrezId}-{symbol}` e.g. `3921-RPSA`
 * - Symbol-only e.g. `RPSA` (Discover pins, gene tables) → resolve + redirect
 */
export default async function GenePage({ params }: { params: { id: string } }) {
  const rawId = decodeURIComponent(params.id || '').trim()
  if (!rawId) notFound()

  const parts = rawId.split('-')
  const head = parts[0] ?? ''
  const symbolFromPath = parts.length > 1 ? parts.slice(1).join('-') : ''

  // Symbol-only (or non-numeric head): resolve via MyGene, then canonical redirect
  if (!/^\d+$/.test(head)) {
    const hits = await searchGenes(rawId)
    if (!hits.length) notFound()

    const upper = rawId.toUpperCase()
    const hit =
      hits.find((g) => g.symbol?.toUpperCase() === upper) ||
      hits.find((g) =>
        normalizeAliases(g.aliases).some((a) => a.toUpperCase() === upper),
      ) ||
      hits[0]

    if (!hit?.geneId || !/^\d+$/.test(String(hit.geneId))) notFound()

    const sym = (hit.symbol || rawId).replace(/\//g, '')
    redirect(`/gene/${hit.geneId}-${sym}`)
  }

  const geneId = head
  const geneData = await getGeneById(geneId)
  if (!geneData) {
    notFound()
  }

  return (
    <GeneDetailPageClient
      geneId={geneId}
      symbol={geneData.symbol || symbolFromPath}
      name={geneData.name || ''}
      summary={geneData.summary || ''}
      chromosome={geneData.mapLocation || ''}
      typeOfGene={geneData.typeOfGene || ''}
      aliases={normalizeAliases(geneData.aliases)}
      ensemblId={geneData.ensemblId || ''}
      uniprotId={geneData.uniprotId || ''}
    />
  )
}
