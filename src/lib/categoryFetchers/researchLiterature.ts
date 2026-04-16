import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getApiParamNumber } from '@/lib/resolveApiQuery'

import { getLiteratureByName } from '@/lib/api/europepmc'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getSecFilingsByName } from '@/lib/api/secedgar'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { getCitationMetrics } from '@/lib/api/opencitations'
import { searchPubMed } from '@/lib/api/pubmed'
import { searchCrossRef } from '@/lib/api/crossref'
import { searchArXiv } from '@/lib/api/arxiv'

export async function fetchResearchLiterature(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [literature, nihGrants, patents, secFilings, semanticPapers, openAlexWorks, pubmedArticles, crossRefWorks, arxivPapers] = await Promise.all([
    trackedSafe('europepmc', getLiteratureByName(queryFor('literature')), []),
    trackedSafe('nihreporter', getNihGrantsByName(queryFor('nih-reporter')), []),
    trackedSafe('patents', getPatentsByMoleculeName(queryFor('patents')), []),
    trackedSafe('secedgar', getSecFilingsByName(queryFor('sec')), []),
    trackedSafe('semantic-scholar', getSemanticPapersByName(queryFor('semantic-scholar')), []),
    trackedSafe('openalex', getOpenAlexWorksByName(queryFor('open-alex')), []),
    trackedSafe('pubmed', searchPubMed(queryFor('pubmed'), getApiParamNumber(apiParams, 'pubmed', 'maxResults', 20)), []),
    trackedSafe('crossref', searchCrossRef(queryFor('crossref')), []),
    trackedSafe('arxiv', searchArXiv(queryFor('arxiv')), []),
  ])
  const dois = (literature as Array<{doi?: string}>).map(l => l.doi).filter(Boolean) as string[]
  const citationMetrics = await trackedSafe('opencitations', getCitationMetrics(dois), [])
  return { literature, nihGrants, patents, secFilings, semanticPapers, openAlexWorks, citationMetrics, pubmedArticles, crossRefWorks, arxivPapers }
}