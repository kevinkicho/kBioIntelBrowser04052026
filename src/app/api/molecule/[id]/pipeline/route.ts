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

const CACHE_DURATION = 86400

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
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

  const [
    clinicalTrials,
    chemblIndications,
    chemblMechanisms,
    orangeBookEntries,
    ndcProducts,
    drugLabels,
    drugShortagesData,
    myChemData,
  ] = await Promise.allSettled([
    getClinicalTrialsByName(searchName, 20).catch(() => []),
    getChemblIndicationsByName(searchName).catch(() => []),
    getChemblMechanismsByName(searchName).catch(() => []),
    getOrangeBookByName(searchName).catch(() => []),
    getNdcProductsByName(searchName).catch(() => []),
    getDrugLabelsByName(searchName).catch(() => []),
    searchDrugShortages(searchName).then(d => d.shortages ?? []).catch(() => []),
    getMyChemData(searchName).catch(() => ({ chemicals: [] })),
  ])

  function settle<T>(result: PromiseSettledResult<T>): T[] {
    if (result.status === 'fulfilled' && result.value && Array.isArray(result.value)) return result.value as T[]
    return []
  }

  const myChem = myChemData.status === 'fulfilled' && myChemData.value ? myChemData.value.chemicals : []

  return NextResponse.json(
    {
      clinicalTrials: settle(clinicalTrials),
      chemblIndications: settle(chemblIndications),
      chemblMechanisms: settle(chemblMechanisms),
      orangeBookEntries: settle(orangeBookEntries),
      ndcProducts: settle(ndcProducts),
      drugLabels: settle(drugLabels),
      drugShortages: settle(drugShortagesData),
      myChemAnnotations: myChem,
    },
    { headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` } }
  )
}