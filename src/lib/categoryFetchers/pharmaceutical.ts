import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'

import { getDrugsByIngredient } from '@/lib/api/openfda'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getHealthCanadaProductsByName } from '@/lib/api/healthCanadaDpd'
import { getEmaMedicinesByName } from '@/lib/api/emaMedicines'
import { getBiologicsLicensedByName } from '@/lib/api/biologicsLicensed'
import { searchPurpleBookByName } from '@/lib/api/purpleBookCache'
import { searchPurpleBookPatentsByName } from '@/lib/api/purpleBookPatents'
import { searchEmaBulkByName } from '@/lib/api/emaMedicinesBulk'
import { buildInternationalRegulatorLinks } from '@/lib/regulatorDeepLinks'
import { buildEstablishmentDeepLinks } from '@/lib/establishmentDeepLinks'
import { buildBiosimilarFamily } from '@/lib/biosimilarFamily'
import { getDrugPricesByName } from '@/lib/api/nadac'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { getAtcClassificationsByName } from '@/lib/api/atc'
import { getDrugCentralEnhanced } from '@/lib/api/drugcentral'
import { searchGSRS } from '@/lib/api/gsrs'
import { getPharmGKBData } from '@/lib/api/pharmgkb'
import { getCPICData } from '@/lib/api/cpic'
import { getDrugsFdaByName } from '@/lib/api/drugsFda'
import { getOpenFdaLabelSectionsByName } from '@/lib/api/openFdaLabelSections'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchPharmaceutical(name: string, synonyms: string[], queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const searchTerms = [name, ...synonyms.slice(0, 1)]
  const [companiesNested, ndcProducts, orangeBookEntries, drugsFdaApplications, openFdaLabelSections, healthCanadaProducts, emaMedicines, biologicsLicensed, purpleBookResult, purpleBookPatentsResult, emaBulkResult, drugPrices, drugInteractions, drugLabels, atcClassifications, drugCentralData, gsrsSubstances, pharmgkbData, cpicGuidelines] = await Promise.all([
    trackedSafe('openfda', Promise.all(searchTerms.map(t => getDrugsByIngredient(t))).then(r => r.filter(Boolean)), []),
    trackedSafe('fda-ndc', getNdcProductsByName(queryFor('companies')), []),
    trackedSafe('orangebook', getOrangeBookByName(queryFor('orange-book')), []),
    trackedSafe('drugs-fda', getDrugsFdaByName(queryFor('drugs-fda') || name), []),
    trackedSafe(
      'openfda-labels',
      getOpenFdaLabelSectionsByName(queryFor('openfda-labels') || name),
      [],
    ),
    trackedSafe('health-canada-dpd', getHealthCanadaProductsByName(queryFor('health-canada') || name), []),
    trackedSafe('ema-medicines', getEmaMedicinesByName(queryFor('ema-medicines') || name), []),
    trackedSafe(
      'biologics-licensed',
      getBiologicsLicensedByName(queryFor('biologics-licensed') || name),
      [],
    ),
    trackedSafe(
      'purple-book',
      searchPurpleBookByName(queryFor('purple-book') || name),
      { meta: null, products: [] },
    ),
    trackedSafe(
      'purple-book-patents',
      searchPurpleBookPatentsByName(queryFor('purple-book-patents') || name, 60),
      { meta: null, patents: [] },
    ),
    trackedSafe(
      'ema-bulk',
      searchEmaBulkByName(queryFor('ema-bulk') || name, { limit: 30 }),
      { meta: null, products: [] },
    ),
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
  // Prefer sponsor/applicant from biologics or Purple Book for establishment portal hints
  const firmHint =
    biologicsLicensed[0]?.sponsorName ||
    purpleBookResult.products[0]?.applicant ||
    companies[0]?.company ||
    name
  return {
    companies,
    ndcProducts,
    orangeBookEntries,
    drugsFdaApplications,
    openFdaLabelSections,
    healthCanadaProducts,
    emaMedicines,
    biologicsLicensed,
    purpleBookProducts: purpleBookResult.products,
    purpleBookMeta: purpleBookResult.meta,
    purpleBookPatents: purpleBookPatentsResult.patents,
    purpleBookPatentsMeta: purpleBookPatentsResult.meta,
    emaBulkMedicines: emaBulkResult.products,
    emaBulkMeta: emaBulkResult.meta,
    establishmentLinks: buildEstablishmentDeepLinks(firmHint),
    establishmentFirmHint: firmHint,
    drugPrices,
    drugInteractions,
    drugLabels,
    atcClassifications,
    drugCentralEnhanced: drugCentralData,
    gsrsSubstances,
    pharmgkbDrugs: pharmgkbData.drugs,
    cpicGuidelines,
    // Portal-first regulator deep links (sync, free, no scrape)
    internationalRegulatorLinks: buildInternationalRegulatorLinks(name),
    biosimilarFamily: buildBiosimilarFamily({
      moleculeName: name,
      purpleBookProducts: purpleBookResult.products,
      biologicsLicensed,
      purpleBookPatents: purpleBookPatentsResult.patents,
      emaBulkMedicines: emaBulkResult.products,
    }),
  }
}