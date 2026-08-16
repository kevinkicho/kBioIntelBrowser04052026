import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from '@/lib/api/pubchem'
import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { searchDrugShortages } from '@/lib/api/fda-drug-shortages'
import { getMyChemData } from '@/lib/api/mychem'
import { trackedSafe } from '@/lib/api-tracker'
import { isTimeoutError, withTimeout } from '@/lib/utils'
import { getCached, setCache } from '@/lib/cache'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

const CACHE_DURATION = 86400
const PIPELINE_SOURCE_TIMEOUT_MS = 8000
const PIPELINE_OVERALL_TIMEOUT_MS = 15000
const PIPELINE_CACHE_TTL_MS = 3600_000

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const cacheKey = `pipeline:${cid}`
  const cached = getCached<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` },
    })
  }

  let molecule
  try {
    molecule = await getMoleculeById(cid)
  } catch (error) {
    if (error instanceof PubChemUpstreamError) {
      return NextResponse.json(
        {
          error: 'Upstream molecule lookup unavailable',
          retryable: true,
          message: error.message,
        },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: 'Failed to fetch molecule' }, { status: 500 })
  }
  if (!molecule) {
    return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
  }

  const name = molecule.name
  const synonyms = molecule.synonyms || []
  const searchName = name || synonyms[0] || String(cid)

  const emptyList = <T,>(): T[] => []

  let payload: Record<string, unknown>
  try {
    payload = await withTimeout(
      (async () => {
        const [
          clinicalTrials,
          chemblIndications,
          chemblMechanisms,
          orangeBookEntries,
          ndcProducts,
          drugLabels,
          drugShortagesData,
          myChemData,
        ] = await Promise.all([
          trackedSafe('pipeline-clinicaltrials', getClinicalTrialsByName(searchName, 20), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe('pipeline-chembl-indications', getChemblIndicationsByName(searchName), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe('pipeline-chembl-mechanisms', getChemblMechanismsByName(searchName), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe('pipeline-orangebook', getOrangeBookByName(searchName), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe('pipeline-ndc', getNdcProductsByName(searchName), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe('pipeline-dailymed', getDrugLabelsByName(searchName), emptyList(), PIPELINE_SOURCE_TIMEOUT_MS),
          trackedSafe(
            'pipeline-drug-shortages',
            searchDrugShortages(searchName).then((d) => d.shortages ?? []),
            emptyList(),
            PIPELINE_SOURCE_TIMEOUT_MS,
          ),
          trackedSafe(
            'pipeline-mychem',
            getMyChemData(searchName).then((d) => d?.chemicals ?? []),
            emptyList(),
            PIPELINE_SOURCE_TIMEOUT_MS,
          ),
        ])

        return {
          clinicalTrials,
          chemblIndications,
          chemblMechanisms,
          orangeBookEntries,
          ndcProducts,
          drugLabels,
          drugShortages: drugShortagesData,
          myChemAnnotations: myChemData,
        }
      })(),
      PIPELINE_OVERALL_TIMEOUT_MS,
    )
  } catch (err) {
    // 15s wall-clock must not be stored as "not retrieved this session" for 24h.
    const timedOut = isTimeoutError(err)
    payload = {
      clinicalTrials: [],
      chemblIndications: [],
      chemblMechanisms: [],
      orangeBookEntries: [],
      ndcProducts: [],
      drugLabels: [],
      drugShortages: [],
      myChemAnnotations: [],
      _partial: true,
      ...(timedOut ? { _timeout: true } : {}),
      _error: err instanceof Error ? err.message : 'Pipeline budget exceeded',
    }
    return NextResponse.json(payload)
  }

  // Honest empty envelope when all free-API bags are empty (still a live route)
  const bagKeys = [
    'clinicalTrials',
    'chemblIndications',
    'chemblMechanisms',
    'orangeBookEntries',
    'ndcProducts',
    'drugLabels',
    'drugShortages',
    'myChemAnnotations',
  ] as const
  const anyRows = bagKeys.some((k) => {
    const v = payload[k]
    return Array.isArray(v) && v.length > 0
  })
  if (!anyRows) {
    payload._emptyHonest = true
    payload._notRetrieved = true
    payload._honesty =
      'Pipeline free-API bags empty this session — not proof of zero pipeline activity forever.'
  }

  // Do not cache timeout / empty-as-success as full success (CDN or process cache).
  if (shouldCacheHonestyEnvelope(payload) && anyRows) {
    setCache(cacheKey, payload, PIPELINE_CACHE_TTL_MS)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` },
    })
  }

  return NextResponse.json(payload)
}
