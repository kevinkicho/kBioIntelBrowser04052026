import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getApiParamNumber } from '@/lib/resolveApiQuery'

import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { searchISRCTN } from '@/lib/api/isrctn'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getClinVarVariantsByName } from '@/lib/api/clinvar'
import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'
import { getToxCastData } from '@/lib/api/toxcast'
import { getSIDERData } from '@/lib/api/sider'
import { searchIRIS } from '@/lib/api/iris'
import { searchDrugShortages } from '@/lib/api/fda-drug-shortages'
import { resolveRorByNames, searchRorOrganizations } from '@/lib/api/ror'
import { resolveCmsHospitalsByNames } from '@/lib/api/cmsHospitals'
import type { ClinicalTrial } from '@/lib/types'

function collectTrialOrgNames(trials: ClinicalTrial[]): string[] {
  const names: string[] = []
  for (const t of trials) {
    if (t.sponsor) names.push(t.sponsor)
    for (const f of t.facilities ?? []) {
      if (f.name) names.push(f.name)
    }
  }
  return names
}

export async function fetchClinicalSafety(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const clinicalTrialsLimit = getApiParamNumber(apiParams, 'clinical-trials', 'maxResults', 10)
  const [clinicalTrials, isrctnTrials, adverseEvents, drugRecalls, chemblIndications, clinVarVariants, gwasAssociations, toxcastData, siderData, irisAssessments, drugShortagesData] = await Promise.all([
    trackedSafe('clinicaltrials', getClinicalTrialsByName(queryFor('clinical-trials'), clinicalTrialsLimit), []),
    trackedSafe('isrctn', searchISRCTN(name), []),
    trackedSafe('adverseevents', getAdverseEventsByName(queryFor('adverse-events')), []),
    trackedSafe('recalls', getDrugRecallsByName(queryFor('recalls')), []),
    trackedSafe('chembl-indications', getChemblIndicationsByName(name), []),
    trackedSafe('clinvar', getClinVarVariantsByName(queryFor('clinvar'), getApiParamNumber(apiParams, 'clinvar', 'maxResults', 20)), []),
    trackedSafe('gwas-catalog', getGwasAssociationsByName(queryFor('gwas-catalog')), []),
    trackedSafe('toxcast', getToxCastData(queryFor('toxcast')), null),
    trackedSafe('sider', getSIDERData(queryFor('sider')), { sideEffects: [] }),
    trackedSafe('iris', searchIRIS(queryFor('iris')), []),
    trackedSafe('fda-drug-shortages', searchDrugShortages(name), { shortages: [], total: 0 }),
  ])

  const orgNames = collectTrialOrgNames(clinicalTrials)
  const facilityNames = clinicalTrials.flatMap((t) =>
    (t.facilities ?? []).map((f) => f.name).filter(Boolean),
  )
  const [researchOrgsFromSponsors, researchOrgsFromName, usHospitals] = await Promise.all([
    trackedSafe('ror-sponsors', resolveRorByNames(orgNames, 10), []),
    trackedSafe('ror-query', searchRorOrganizations(queryFor('research-orgs') || name), []),
    trackedSafe(
      'cms-hospitals',
      resolveCmsHospitalsByNames(
        facilityNames.length > 0 ? facilityNames : orgNames.slice(0, 6),
        10,
      ),
      [],
    ),
  ])
  // Prefer sponsor-matched ROR, then fill from name query
  const seenRor = new Set<string>()
  const researchOrgs = []
  for (const o of [...researchOrgsFromSponsors, ...researchOrgsFromName]) {
    if (seenRor.has(o.rorId)) continue
    seenRor.add(o.rorId)
    researchOrgs.push(o)
    if (researchOrgs.length >= 20) break
  }

  return {
    clinicalTrials,
    isrctnTrials,
    adverseEvents,
    drugRecalls,
    chemblIndications,
    clinVarVariants,
    gwasAssociations,
    toxcast: toxcastData,
    siderSideEffects: siderData.sideEffects,
    irisAssessments,
    drugShortages: drugShortagesData.shortages,
    researchOrgs,
    usHospitals,
  }
}