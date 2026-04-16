import { trackedSafe } from '@/lib/api-tracker'
import { API_SOURCE_TIMEOUTS } from '@/lib/utils'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getApiParamNumber } from '@/lib/resolveApiQuery'

import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { getBioAssaysByName } from '@/lib/api/bioassay'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'
import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { getPharosTargetsByName } from '@/lib/api/pharos'
import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'
import { getDiseaseAssociationsByName } from '@/lib/api/opentargets'
import { getCTDData } from '@/lib/api/ctd'
import { getIEDBData } from '@/lib/api/iedb'
import { getLINCSSignaturesByName } from '@/lib/api/lincs'
import { getTTDData } from '@/lib/api/ttd'

export async function fetchBioactivityTargets(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const chemblLimit = getApiParamNumber(apiParams, 'chembl', 'maxResults', 20)
  const [chemblActivities, bioAssays, chemblMechanisms, pharmacologyTargets, bindingAffinities, pharosTargets, drugGeneInteractions, diseaseAssociations, ctdData, iedbData, lincsSignatures, ttdData] = await Promise.all([
    trackedSafe('chembl', getChemblActivitiesByName(queryFor('chembl'), chemblLimit), [], API_SOURCE_TIMEOUTS['chembl']),
    trackedSafe('bioassay', getBioAssaysByName(queryFor('bioassay')), []),
    trackedSafe('chembl-mechanisms', getChemblMechanismsByName(queryFor('chembl-mechanisms'), getApiParamNumber(apiParams, 'chembl-mechanisms', 'maxResults', 20)), [], API_SOURCE_TIMEOUTS['chembl-mechanisms']),
    trackedSafe('iuphar', getPharmacologyTargetsByName(queryFor('iuphar')), []),
    trackedSafe('bindingdb', getBindingAffinitiesByName(queryFor('bindingdb')), []),
    trackedSafe('pharos', getPharosTargetsByName(queryFor('pharos')), []),
    trackedSafe('dgidb', getDrugGeneInteractionsByName(queryFor('dgidb')), []),
    trackedSafe('opentargets', getDiseaseAssociationsByName(queryFor('opentargets')), [], API_SOURCE_TIMEOUTS['opentargets']),
    trackedSafe('ctd', getCTDData(queryFor('ctd'), false), { interactions: [], diseaseAssociations: [] }),
    trackedSafe('iedb', getIEDBData(queryFor('iedb')), { epitopes: [] }),
    trackedSafe('lincs', getLINCSSignaturesByName(queryFor('lincs')), [], API_SOURCE_TIMEOUTS['lincs']),
    trackedSafe('ttd', getTTDData(queryFor('ttd')), { targets: [], drugs: [] }),
  ])
  return {
    chemblActivities,
    bioAssays,
    chemblMechanisms,
    pharmacologyTargets,
    bindingAffinities,
    pharosTargets,
    drugGeneInteractions,
    diseaseAssociations,
    ctdInteractions: ctdData.interactions,
    ctdDiseaseAssociations: ctdData.diseaseAssociations,
    iedbEpitopes: iedbData.epitopes,
    lincsSignatures,
    ttdTargets: ttdData.targets,
    ttdDrugs: ttdData.drugs,
  }
}