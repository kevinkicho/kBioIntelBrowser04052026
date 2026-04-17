import { notFound } from 'next/navigation'
import { getGeneById } from '@/lib/api/mygene'
import { GeneDetailPageClient } from './GeneDetailPageClient'

export default async function GenePage({ params }: { params: { id: string } }) {
  const rawId = params.id
  const parts = rawId.split('-')
  const geneId = parts[0]
  const symbol = parts.length > 1 ? parts.slice(1).join('-') : ''

  if (!geneId || !/^\d+$/.test(geneId)) {
    notFound()
  }

  const geneData = await getGeneById(geneId)
  if (!geneData) {
    notFound()
  }

  return (
    <GeneDetailPageClient
      geneId={geneId}
      symbol={geneData.symbol || symbol}
      name={geneData.name || ''}
      summary={geneData.summary || ''}
      chromosome={geneData.mapLocation || ''}
      typeOfGene={geneData.typeOfGene || ''}
      aliases={geneData.aliases || []}
      ensemblId={geneData.ensemblId || ''}
      uniprotId={geneData.uniprotId || ''}
    />
  )
}