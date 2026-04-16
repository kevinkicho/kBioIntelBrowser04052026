import { safe } from '@/lib/utils'
import { trackedSafe } from '@/lib/api-tracker'
import { API_SOURCE_TIMEOUTS } from '@/lib/utils'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import type { SynthesisRoute } from '@/lib/types'

import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import { getChebiAnnotationByName } from '@/lib/api/chebi'
import { getCompToxByName } from '@/lib/api/comptox'
import { getKeggCompoundId, getKeggReactions, getKeggReactionDetail } from '@/lib/api/kegg'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
import { getMetabolomicsData } from '@/lib/api/metabolomics'
import { getMyChemData } from '@/lib/api/mychem'
import { getHMDBData } from '@/lib/api/hmdb'
import { searchMassBank } from '@/lib/api/massbank'
import { searchChemSpider } from '@/lib/api/chemspider'
import { searchMetaboLights } from '@/lib/api/metabolights'
import { searchGNPSLibrary, searchGNPSNetworks } from '@/lib/api/gnps'
import { searchLipidMaps } from '@/lib/api/lipidmaps'
import { getAllCompoundIds } from '@/lib/api/unichem'
import { searchFooDB } from '@/lib/api/foodb'

async function fetchSynthesisRoutes(moleculeName: string): Promise<SynthesisRoute[]> {
  const [keggId, rheaRoutes] = await Promise.all([
    safe(getKeggCompoundId(moleculeName), null),
    safe(getRheaSynthesisRoutes(moleculeName), []),
  ])
  const keggRoutes: SynthesisRoute[] = []
  if (keggId) {
    const reactionIds = await safe(getKeggReactions(keggId), [])
    const details = await Promise.all((reactionIds as string[]).slice(0, 5).map(id => safe(getKeggReactionDetail(id), null)))
    for (const detail of details) {
      if (!detail) continue
      keggRoutes.push({
        method: detail.name,
        description: detail.equation,
        keggReactionIds: [detail.id],
        enzymesInvolved: detail.enzymes,
        precursors: [],
        source: 'kegg',
      })
    }
  }
  return [...keggRoutes, ...(rheaRoutes as SynthesisRoute[])]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchMolecularChemical(name: string, cid: number, molecularWeight: number, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [computedProperties, ghsHazards, chebiAnnotation, compToxData, routes, metabolomicsData, myChemData, hmdbData, massBankSpectra, chemSpiderCompounds, metabolightsData, gnpsData, lipidMapsResult, unichemResult, foodbCompounds] = await Promise.all([
    trackedSafe('pubchem-properties', getComputedPropertiesByCid(cid), null),
    trackedSafe('pubchem-hazards', getGhsHazardsByCid(cid), { signalWord: '', hazardStatements: [], precautionaryStatements: [] }),
    trackedSafe('chebi', getChebiAnnotationByName(queryFor('chebi')), null),
    trackedSafe('comptox', getCompToxByName(queryFor('comptox')), null),
    trackedSafe('synthesis-routes', fetchSynthesisRoutes(name), []),
    trackedSafe('metabolomics', getMetabolomicsData(name, molecularWeight), { metabolites: [], studies: [] }),
    trackedSafe('mychem', getMyChemData(queryFor('mychem')), { chemicals: [] }),
    trackedSafe('hmdb', getHMDBData(queryFor('hmdb')), { metabolites: [] }),
    trackedSafe('massbank', searchMassBank(queryFor('massbank')), [], API_SOURCE_TIMEOUTS['massbank']),
    trackedSafe('chemspider', searchChemSpider(queryFor('chemspider')), []),
    trackedSafe('metabolights', searchMetaboLights(name), []),
    trackedSafe('gnps-library', Promise.all([searchGNPSLibrary(name), searchGNPSNetworks(name)]).then(([spectra, clusters]) => ({ spectra, clusters })), { spectra: [], clusters: [] }),
    trackedSafe('lipidmaps', searchLipidMaps(queryFor('lipidmaps')), { lipids: [], total: 0 }),
    trackedSafe('unichem', getAllCompoundIds('pubchem', String(cid)), { inchiKey: null, mappings: {} }),
    trackedSafe('foodb', searchFooDB(name), []),
  ])
  return {
    computedProperties,
    ghsHazards,
    chebiAnnotation,
    compToxData,
    routes,
    metabolomicsData,
    myChemAnnotations: myChemData.chemicals,
    hmdbMetabolites: hmdbData.metabolites,
    massBankSpectra,
    chemSpiderCompounds,
    metabolightsData: { studies: metabolightsData, metabolites: [] },
    gnpsData,
    lipidMapsLipids: lipidMapsResult.lipids,
    unichemMappings: Object.entries(unichemResult.mappings).map(([source, id]) => ({
      sourceId: source.toLowerCase(),
      sourceName: source,
      externalId: id,
      url: `https://www.ebi.ac.uk/unichem/#/search/${source.toLowerCase()}/${encodeURIComponent(id)}`,
    })),
    foodbCompounds,
  }
}