import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { searchDrugShortages } from '@/lib/api/fda-drug-shortages'
import { getMyChemData } from '@/lib/api/mychem'
import { trackedSafe } from '@/lib/api-tracker'
import { withTimeout } from '@/lib/utils'
import { getCached, setCache } from '@/lib/cache'

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
  } catch {
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
  } catch {
    payload = {
      clinicalTrials: [],
      chemblIndications: [],
      chemblMechanisms: [],
      orangeBookEntries: [],
      ndcProducts: [],
      drugLabels: [],
      drugShortages: [],
      myChemAnnotations: [],
    }
  }

  setCache(cacheKey, payload, PIPELINE_CACHE_TTL_MS)

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` },
  })
}
