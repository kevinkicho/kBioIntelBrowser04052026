import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getApiParamNumber } from '@/lib/resolveApiQuery'

import { getProteinInteractionsByName } from '@/lib/api/string-db'
import { getChemicalInteractionsByName } from '@/lib/api/stitch'
import { getMolecularInteractionsByName } from '@/lib/api/intact'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'
import { searchBioCyc } from '@/lib/api/biocyc'
import { searchSMPDB } from '@/lib/api/smpdb'
import { getKEGGData } from '@/lib/api/kegg'

export async function fetchInteractionsPathways(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [proteinInteractions, chemicalProteinInteractions, molecularInteractions, reactomePathways, wikiPathways, pathwayCommonsResults, bioCycPathways, smpdbPathways, keggData] = await Promise.all([
    trackedSafe('string-db', getProteinInteractionsByName(queryFor('string'), getApiParamNumber(apiParams, 'string', 'maxResults', 10), Number(apiParams['string']?.minScore ?? 0)), []),
    trackedSafe('stitch', getChemicalInteractionsByName(queryFor('stitch')), []),
    trackedSafe('intact', getMolecularInteractionsByName(queryFor('intact')), []),
    trackedSafe('reactome', getReactomePathwaysByName(queryFor('reactome')), []),
    trackedSafe('wikipathways', getWikiPathwaysByName(queryFor('wikipathways')), []),
    trackedSafe('pathway-commons', getPathwayCommonsByName(queryFor('pathway-commons')), []),
    trackedSafe('biocyc', searchBioCyc(queryFor('biocyc')), []),
    trackedSafe('smpdb', searchSMPDB(queryFor('smpdb')), []),
    trackedSafe('kegg', getKEGGData(queryFor('kegg')), { pathways: [], compounds: [], drugs: [] }),
  ])
  return { proteinInteractions, chemicalProteinInteractions, molecularInteractions, reactomePathways, wikiPathways, pathwayCommonsResults, bioCycPathways, smpdbPathways, keggData }
}