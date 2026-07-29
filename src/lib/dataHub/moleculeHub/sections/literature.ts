/**
 * Hub section: Literature (entity samples, not only counts)
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'

export function buildLiteraturePart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Literature (entity samples, not only counts) ---
  const lit = asArr(data, 'literature')
  const pubmed = asArr(data, 'pubmedArticles')
  const openalex = asArr(data, 'openAlexWorks')
  const semantic = asArr(data, 'semanticPapers')
  const arxiv = asArr(data, 'arxivPapers')
  const crossref = asArr(data, 'crossRefWorks')
  const nsf = asArr(data, 'nsfAwards')
  const openaire = asArr(data, 'openAireProjects')
  const citations = asArr(data, 'citationMetrics')
  const nih = asArr(data, 'nihGrants')
  const patents = asArr(data, 'patents')
  const binding = asArr(data, 'bindingAffinities')
  const firstLit = lit[0] || pubmed[0] || openalex[0] || semantic[0] || arxiv[0] || crossref[0]
  const secondLit = lit[1] || pubmed[1] || openalex[1]
  const firstGrant = nih[0]
  const secondGrant = nih[1]
  const firstPatent = patents[0]

  const litYear =
    str(firstLit?.year) ||
    str(firstLit?.publicationDate)?.slice(0, 4) ||
    str(firstLit?.pubDate)?.slice(0, 4) ||
    null
  const litDoi = str(firstLit?.doi)
  const litPmid = str(firstLit?.pmid) || str(firstLit?.id)
  const litUrl =
    str(firstLit?.url) ||
    (litDoi ? `https://doi.org/${litDoi.replace(/^https?:\/\/doi\.org\//i, '')}` : null) ||
    (litPmid && /^\d+$/.test(litPmid)
      ? `https://pubmed.ncbi.nlm.nih.gov/${litPmid}/`
      : null) ||
    str(firstLit?.doiUrl) ||
    undefined

  const litRows: DataHubRow[] = [
    row({
      id: 'lit-epmc',
      fact: 'Europe PMC hits',
      value: lit.length ? String(lit.length) : null,
      source: 'Europe PMC',
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: 'Session sample size — not full database count',
    }),
    row({
      id: 'lit-pubmed',
      fact: 'PubMed hits',
      value: pubmed.length ? String(pubmed.length) : null,
      source: 'PubMed',
      panelId: 'pubmed',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-openalex',
      fact: 'OpenAlex works',
      value: openalex.length ? String(openalex.length) : null,
      source: 'OpenAlex',
      panelId: 'openalex',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-semantic',
      fact: 'Semantic Scholar papers',
      value: semantic.length ? String(semantic.length) : null,
      source: 'Semantic Scholar',
      panelId: 'semantic-scholar',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-arxiv',
      fact: 'arXiv papers',
      value: arxiv.length ? String(arxiv.length) : null,
      source: 'arXiv',
      panelId: 'arxiv',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: 'Preprints — not peer-review status',
    }),
    row({
      id: 'lit-crossref',
      fact: 'Crossref works',
      value: crossref.length ? String(crossref.length) : null,
      source: 'Crossref',
      panelId: 'crossref',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-nsf',
      fact: 'NSF awards',
      value: nsf.length ? String(nsf.length) : null,
      source: 'NSF Awards',
      panelId: 'nsf-awards',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-openaire',
      fact: 'OpenAIRE projects',
      value: openaire.length ? String(openaire.length) : null,
      source: 'OpenAIRE',
      panelId: 'openaire-projects',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-opencite',
      fact: 'OpenCitations DOI metrics',
      value: citations.length ? String(citations.length) : null,
      source: 'OpenCitations',
      panelId: 'opencitations',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: 'Citation counts for DOIs in session sample',
    }),
    row({
      id: 'tg-bindingdb-n',
      fact: 'BindingDB affinities',
      value: binding.length ? String(binding.length) : null,
      source: 'BindingDB',
      panelId: 'bindingdb',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'lit-sample-title',
      fact: 'Paper title (sample)',
      value: str(firstLit?.title)?.slice(0, 160),
      source:
        lit.length > 0
          ? 'Europe PMC'
          : pubmed.length > 0
            ? 'PubMed'
            : openalex.length > 0
              ? 'OpenAlex'
              : 'Literature APIs',
      sourceUrl: litUrl,
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: [litYear, str(firstLit?.journal)].filter(Boolean).join(' · ') || undefined,
    }),
    row({
      id: 'lit-sample-year',
      fact: 'Paper year (sample)',
      value: litYear,
      source: 'Literature APIs',
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-sample-doi',
      fact: 'DOI / PMID (sample)',
      value: litDoi || litPmid,
      source: 'Literature APIs',
      sourceUrl: litUrl,
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-sample-title-2',
      fact: 'Paper title (2nd sample)',
      value: str(secondLit?.title)?.slice(0, 140),
      source: 'Literature APIs',
      sourceUrl:
        str(secondLit?.url) ||
        (str(secondLit?.doi)
          ? `https://doi.org/${String(secondLit.doi).replace(/^https?:\/\/doi\.org\//i, '')}`
          : undefined),
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-nih',
      fact: 'NIH RePORTER grants',
      value: nih.length ? String(nih.length) : null,
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-grant-title',
      fact: 'Grant title (sample)',
      value: str(firstGrant?.title)?.slice(0, 140),
      source: 'NIH RePORTER',
      sourceUrl: str(firstGrant?.projectNumber)
        ? `https://reporter.nih.gov/search/${encodeURIComponent(String(firstGrant.projectNumber))}/projects`
        : undefined,
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: [str(firstGrant?.institute), str(firstGrant?.piName)].filter(Boolean).join(' · ') || undefined,
    }),
    row({
      id: 'lit-grant-pi',
      fact: 'Grant PI (sample)',
      value: str(firstGrant?.piName),
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-grant-inst',
      fact: 'Grant institute (sample)',
      value: str(firstGrant?.institute),
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: str(firstGrant?.startDate)?.slice(0, 4) || undefined,
    }),
    row({
      id: 'lit-grant-title-2',
      fact: 'Grant title (2nd sample)',
      value: str(secondGrant?.title)?.slice(0, 120),
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-patents',
      fact: 'Patent hits',
      value: patents.length ? String(patents.length) : null,
      source: 'PatentsView',
      panelId: 'patents',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-patent-title',
      fact: 'Patent title (sample)',
      value: str(firstPatent?.title)?.slice(0, 140),
      source: 'PatentsView',
      panelId: 'patents',
      categoryId: 'research-literature',
      domain: 'literature',
      detail: str(firstPatent?.patentNumber) || str(firstPatent?.assignee) || undefined,
    }),
  ]
  all.push(...litRows)
  sections.push(section('literature', 'Literature, grants & IP', 'literature', litRows))


  return { rows: all, sections }
}
