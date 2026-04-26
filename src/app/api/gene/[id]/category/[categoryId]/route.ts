import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/cache'
import { getCategoryTimeout, withTimeout } from '@/lib/utils'
import { flushApiMetrics } from '@/lib/api-tracker'
import { recordMetric } from '@/lib/analytics/db'
import { fetchGene } from '@/lib/categoryFetchers'

const VALID_CATEGORIES = ['gene']

function parseGeneId(id: string): { geneId: string; symbol: string } | null {
  const parts = id.split('-')
  if (parts.length >= 2) {
    return { geneId: parts[0], symbol: parts.slice(1).join('-') }
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } }
) {
  const geneIdParam = params.id
  const categoryId = params.categoryId

  if (!VALID_CATEGORIES.includes(categoryId)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const parsed = parseGeneId(geneIdParam)
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid gene ID format. Use {entrezId}-{symbol}' }, { status: 400 })
  }

  const { geneId, symbol } = parsed

  const cacheKey = `gene-category:${geneId}:${symbol}:${categoryId}`
  const cached = getCached<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const categoryTimeout = getCategoryTimeout(categoryId)

  let data: Record<string, unknown>
  try {
    const fetchPromise = (async () => {
      return await fetchGene(geneId, symbol)
    })()

    data = await withTimeout(fetchPromise as Promise<Record<string, unknown>>, categoryTimeout + 3000)

    for (const m of flushApiMetrics()) {
      recordMetric({
        source: m.source,
        endpoint: '',
        status: m.status,
        duration_ms: m.duration_ms,
        error: m.error,
        has_data: m.has_data,
      })
    }
  } catch (err) {
    for (const m of flushApiMetrics()) {
      recordMetric({
        source: m.source,
        endpoint: '',
        status: m.status,
        duration_ms: m.duration_ms,
        error: m.error,
        has_data: m.has_data,
      })
    }
    console.error(`[api/gene/category] Error fetching ${categoryId} for gene ${geneId}:`, err)
    return NextResponse.json({
      error: 'Failed to fetch category data',
      category: categoryId,
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  setCache(cacheKey, data)
  return NextResponse.json(data)
}