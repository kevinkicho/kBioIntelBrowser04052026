import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getApiParamNumber } from '@/lib/resolveApiQuery'

import { getLiteratureByName } from '@/lib/api/europepmc'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getNsfAwardsByKeyword } from '@/lib/api/nsfAwards'
import {
  getEuResearchProjectsByName,
  getOpenAirePublicationsByName,
} from '@/lib/api/openaire'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getSecFilingsByName } from '@/lib/api/secedgar'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { getCitationMetrics } from '@/lib/api/opencitations'
import { searchPubMed } from '@/lib/api/pubmed'
import { searchCrossRef } from '@/lib/api/crossref'
import { searchArXiv } from '@/lib/api/arxiv'
import { resolveRorByNames, searchRorOrganizations } from '@/lib/api/ror'
import { resolveUsCollegesByNames, searchUsCollegesByName } from '@/lib/api/collegeScorecard'
import { searchEuResearchOrgsPack } from '@/lib/api/euResearchOrgs'
import { buildEvidenceNeighborhood } from '@/lib/evidenceNeighborhood'

export async function fetchResearchLiterature(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [literature, nihGrants, nsfAwards, openAireProjects, openAirePublications, patents, secFilings, semanticPapers, openAlexWorks, pubmedArticles, crossRefWorks, arxivPapers] = await Promise.all([
    trackedSafe('europepmc', getLiteratureByName(queryFor('literature')), []),
    trackedSafe('nihreporter', getNihGrantsByName(queryFor('nih-reporter')), []),
    trackedSafe('nsf-awards', getNsfAwardsByKeyword(queryFor('nsf-awards') || name), []),
    trackedSafe('openaire', getEuResearchProjectsByName(queryFor('openaire-projects') || name), []),
    trackedSafe(
      'openaire-pubs',
      getOpenAirePublicationsByName(queryFor('openaire-publications') || name),
      [],
    ),
    trackedSafe('patents', getPatentsByMoleculeName(queryFor('patents')), []),
    trackedSafe('secedgar', getSecFilingsByName(queryFor('sec')), []),
    trackedSafe('semantic-scholar', getSemanticPapersByName(queryFor('semantic-scholar')), []),
    trackedSafe('openalex', getOpenAlexWorksByName(queryFor('open-alex')), []),
    trackedSafe('pubmed', searchPubMed(queryFor('pubmed'), getApiParamNumber(apiParams, 'pubmed', 'maxResults', 20)), []),
    trackedSafe('crossref', searchCrossRef(queryFor('crossref')), []),
    trackedSafe('arxiv', searchArXiv(queryFor('arxiv')), []),
  ])
  // Collect DOIs from multiple free lit sources (EuropePMC alone often yields 0-cite stubs)
  const doiSet = new Set<string>()
  const pushDoi = (raw?: string | null) => {
    if (!raw) return
    const d = String(raw)
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:/i, '')
    if (d.includes('/') && d.length > 5) doiSet.add(d)
  }
  for (const l of literature as Array<{ doi?: string }>) pushDoi(l.doi)
  for (const p of semanticPapers as Array<{ doi?: string; externalIds?: { DOI?: string } }>) {
    pushDoi(p.doi)
    pushDoi(p.externalIds?.DOI)
  }
  for (const w of openAlexWorks as Array<{ doi?: string }>) pushDoi(w.doi)
  for (const c of crossRefWorks as Array<{ doi?: string; DOI?: string }>) {
    pushDoi(c.doi)
    pushDoi(c.DOI)
  }
  for (const a of pubmedArticles as Array<{ doi?: string }>) pushDoi(a.doi)

  const dois = Array.from(doiSet).slice(0, 12)
  const grantInstitutes = (nihGrants as Array<{ institute?: string }>)
    .map((g) => g.institute)
    .filter((s): s is string => Boolean(s && s !== 'Unknown'))
  const q = queryFor('research-orgs') || name
  const [citationMetrics, rorFromGrants, rorFromName, euResearchOrgs, usCollegesFromGrants, usCollegesFromName] =
    await Promise.all([
      trackedSafe('opencitations', getCitationMetrics(dois), []),
      trackedSafe('ror-grants', resolveRorByNames(grantInstitutes, 8), []),
      trackedSafe('ror-lit-query', searchRorOrganizations(q), []),
      trackedSafe('ror-eu-pack', searchEuResearchOrgsPack(q, { totalCap: 16, perCountry: 2 }), []),
      trackedSafe('scorecard-grants', resolveUsCollegesByNames(grantInstitutes, 8), []),
      trackedSafe('scorecard-query', searchUsCollegesByName(queryFor('us-colleges') || name, 10), []),
    ])
  const seen = new Set<string>()
  const researchOrgsLit = []
  for (const o of [...rorFromGrants, ...rorFromName]) {
    if (seen.has(o.rorId)) continue
    seen.add(o.rorId)
    researchOrgsLit.push(o)
    if (researchOrgsLit.length >= 16) break
  }
  const seenCollege = new Set<string>()
  const usColleges = []
  for (const c of [...usCollegesFromGrants, ...usCollegesFromName]) {
    if (seenCollege.has(c.id)) continue
    seenCollege.add(c.id)
    usColleges.push(c)
    if (usColleges.length >= 12) break
  }
  return {
    literature,
    nihGrants,
    nsfAwards,
    openAireProjects,
    openAirePublications,
    patents,
    secFilings,
    semanticPapers,
    openAlexWorks,
    citationMetrics,
    pubmedArticles,
    crossRefWorks,
    arxivPapers,
    researchOrgsLit,
    euResearchOrgs,
    usColleges,
    /** Partial neighborhood from lit/grants (merged client-side with clinical when both loaded) */
    evidenceNeighborhoodLit: buildEvidenceNeighborhood({
      moleculeName: name,
      researchOrgsLit,
      euResearchOrgs,
      usColleges,
      nihGrants,
      literature,
      pubmedArticles,
      openAlexWorks,
    }),
  }
}