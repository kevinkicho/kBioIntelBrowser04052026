import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'

import { getDrugsByIngredient } from '@/lib/api/openfda'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getDrugPricesByName } from '@/lib/api/nadac'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { getAtcClassificationsByName } from '@/lib/api/atc'
import { getDrugCentralEnhanced } from '@/lib/api/drugcentral'
import { searchGSRS } from '@/lib/api/gsrs'
import { getPharmGKBData } from '@/lib/api/pharmgkb'
import { getCPICData } from '@/lib/api/cpic'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchPharmaceutical(name: string, synonyms: string[], queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const searchTerms = [name, ...synonyms.slice(0, 1)]
  const [companiesNested, ndcProducts, orangeBookEntries, drugPrices, drugInteractions, drugLabels, atcClassifications, drugCentralData, gsrsSubstances, pharmgkbData, cpicGuidelines] = await Promise.all([
    trackedSafe('openfda', Promise.all(searchTerms.map(t => getDrugsByIngredient(t))).then(r => r.filter(Boolean)), []),
    trackedSafe('fda-ndc', getNdcProductsByName(queryFor('companies')), []),
    trackedSafe('orangebook', getOrangeBookByName(queryFor('orange-book')), []),
    trackedSafe('nadac', getDrugPricesByName(name), []),
    trackedSafe('rxnorm', getDrugInteractionsByName(queryFor('drug-interactions')), []),
    trackedSafe('dailymed', getDrugLabelsByName(name), []),
    trackedSafe('atc', getAtcClassificationsByName(queryFor('atc')), []),
    trackedSafe('drugcentral', getDrugCentralEnhanced(queryFor('drugcentral')), { drug: null, targets: [], indications: [], pharmacologicActions: [], atcCodes: [], manufacturers: [], products: [] }),
    trackedSafe('gsrs', searchGSRS(name), []),
    trackedSafe('pharmgkb', getPharmGKBData(queryFor('pharmgkb')), { drugs: [], genes: [], guidelines: [] }),
    trackedSafe('cpic', getCPICData(queryFor('cpic')), []),
  ])
  const seen = new Set<string>()
  const companies = companiesNested.flat().filter(p => {
    if (seen.has(p.brandName)) return false
    seen.add(p.brandName)
    return true
  })
  return {
    companies,
    ndcProducts,
    orangeBookEntries,
    drugPrices,
    drugInteractions,
    drugLabels,
    atcClassifications,
    drugCentralEnhanced: drugCentralData,
    gsrsSubstances,
    pharmgkbDrugs: pharmgkbData.drugs,
    cpicGuidelines,
  }
}