/**
 * Supporting free-API claim extractors for denser Pack AI grounding.
 * Complements the five Core extractors without inventing efficacy.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type {
  ChemblIndication,
  ComputedProperties,
  DrugGeneInteraction,
  DrugRecall,
  LiteratureResult,
  NihGrant,
  Patent,
  PubMedArticle,
} from '@/lib/types'
import type { OpenAireProject, OpenAirePublication } from '@/lib/api/openaire'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'

export const PATENTS_SOURCE = 'Patents (free public)'
export const NIH_REPORTER_SOURCE = 'NIH RePORTER'
export const EUROPEPMC_SOURCE = 'Europe PMC'
export const PUBMED_SOURCE = 'PubMed'
export const OPENALEX_WORKS_SOURCE = 'OpenAlex'
export const OPENAIRE_SOURCE = 'OpenAIRE'
export const OPENFDA_RECALLS_SOURCE = 'OpenFDA (recalls)'
export const CHEMBL_INDICATION_SOURCE = 'ChEMBL indications'
export const DGIDB_SOURCE = 'DGIdb'
export const PUBCHEM_PROPERTIES_SOURCE = 'PubChem computed properties'
export const ORANGE_BOOK_SOURCE = 'Orange Book (openFDA)'
export const OPENFDA_LABELS_SOURCE = 'DailyMed / openFDA labels'
export const DRUGS_FDA_SOURCE = 'openFDA Drugs@FDA'
export const OPENFDA_LABEL_SECTIONS_SOURCE = 'openFDA label sections'
export const NSF_AWARDS_SOURCE = 'NSF Awards'

/** Loose orange-book row from openFDA client. */
export interface OrangeBookRowLike {
  applicationNumber?: string
  ingredient?: string
  tradeName?: string
  applicant?: string
  teCode?: string
  approvalDate?: string
  patentNumber?: string
  patentExpirationDate?: string
}

/** Loose label row. */
export interface DrugLabelRowLike {
  setId?: string
  title?: string
  brandName?: string
  genericName?: string
  labeler?: string
  url?: string
}

/** Loose OpenAlex work row. */
export interface OpenAlexWorkLike {
  id?: string
  title?: string
  display_name?: string
  publication_year?: number
  doi?: string
  cited_by_count?: number
  openAlexUrl?: string
  url?: string
}

export function extractClaimsFromPatents(
  patents: readonly Patent[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!patents?.length) return []
  const claims: EvidenceClaim[] = []
  for (const p of applyLimit([...patents], ctx.limit ?? 12)) {
    const num = p.patentNumber?.trim() || p.id?.trim()
    if (!num) continue
    const drug = ctx.moleculeName?.trim() || 'molecule'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: PATENTS_SOURCE,
        naturalKey: num,
        statement: `Patent ${num}${p.title ? `: ${p.title}` : ''} related to ${drug}${p.assignee ? ` (assignee ${p.assignee})` : ''}${p.status ? ` · ${p.status}` : ''}.`,
        ctx,
        sourceUrl: `https://patents.google.com/patent/${encodeURIComponent(num)}`,
        quote: p.abstract?.slice(0, 240) || p.title,
      }),
    )
  }
  return claims
}

export function extractClaimsFromNihGrants(
  grants: readonly NihGrant[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!grants?.length) return []
  const claims: EvidenceClaim[] = []
  for (const g of applyLimit([...grants], ctx.limit ?? 12)) {
    const key = g.projectNumber?.trim() || g.projectId?.trim() || g.title?.trim()
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: NIH_REPORTER_SOURCE,
        naturalKey: key,
        statement: `NIH RePORTER project ${g.projectNumber || key}: ${g.title || 'untitled'}${g.institute ? ` · ${g.institute}` : ''}${g.piName ? ` · PI ${g.piName}` : ''} (matched to ${drug}).`,
        ctx,
        sourceUrl: g.projectNumber
          ? `https://reporter.nih.gov/project-details/${encodeURIComponent(g.projectNumber)}`
          : 'https://reporter.nih.gov/',
        quote: g.abstract?.slice(0, 240),
      }),
    )
  }
  return claims
}

export function extractClaimsFromLiterature(
  rows: readonly LiteratureResult[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 10)) {
    const key = r.pmid || r.doi || r.id || r.title
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    const url = r.doi
      ? `https://doi.org/${r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`
      : r.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
        : undefined
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: EUROPEPMC_SOURCE,
        naturalKey: String(key),
        statement: `Europe PMC literature for ${drug}: ${r.title || 'untitled'}${r.journal ? ` (${r.journal}` : ''}${r.year ? `${r.journal ? ', ' : ' ('}${r.year}` : ''}${r.journal || r.year ? ')' : ''}${r.citedByCount != null ? ` · cited ${r.citedByCount}` : ''}.`,
        ctx,
        sourceUrl: url,
        quote: r.abstract?.slice(0, 240),
      }),
    )
  }
  return claims
}

export function extractClaimsFromPubMed(
  rows: readonly PubMedArticle[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 10)) {
    const pmid = r.pmid?.trim()
    if (!pmid) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: PUBMED_SOURCE,
        naturalKey: pmid,
        statement: `PubMed ${pmid}: ${r.title || 'untitled'}${r.journal ? ` · ${r.journal}` : ''}${r.pubDate ? ` · ${r.pubDate}` : ''} (matched to ${drug}).`,
        ctx,
        sourceUrl: r.url || `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        quote: r.abstract?.slice(0, 240),
      }),
    )
  }
  return claims
}

export function extractClaimsFromOpenAlexWorks(
  rows: readonly OpenAlexWorkLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 10)) {
    const title = r.title || r.display_name
    const key = r.id || r.doi || title
    if (!key || !title) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    const id = String(r.id || '').replace('https://openalex.org/', '')
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: OPENALEX_WORKS_SOURCE,
        naturalKey: String(key),
        statement: `OpenAlex work for ${drug}: ${title}${r.publication_year ? ` (${r.publication_year})` : ''}${r.cited_by_count != null ? ` · cited ${r.cited_by_count}` : ''}.`,
        ctx,
        sourceUrl:
          r.openAlexUrl ||
          r.url ||
          (id ? `https://openalex.org/${id}` : r.doi ? `https://doi.org/${r.doi}` : undefined),
      }),
    )
  }
  return claims
}

export function extractClaimsFromOpenAireProjects(
  rows: readonly OpenAireProject[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const p of applyLimit([...rows], ctx.limit ?? 8)) {
    const key = p.id || p.code || p.title
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: OPENAIRE_SOURCE,
        naturalKey: `project:${key}`,
        statement: `OpenAIRE project related to ${drug}: ${p.title || p.acronym || key}${p.funderShort || p.funderName ? ` · funder ${p.funderShort || p.funderName}` : ''}.`,
        ctx,
        sourceUrl: p.url || p.cordisUrl || undefined,
      }),
    )
  }
  return claims
}

export function extractClaimsFromOpenAirePublications(
  rows: readonly OpenAirePublication[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const p of applyLimit([...rows], ctx.limit ?? 8)) {
    const key = p.id || p.doi || p.title
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: OPENAIRE_SOURCE,
        naturalKey: `pub:${key}`,
        statement: `OpenAIRE publication related to ${drug}: ${p.title || key}${p.year ? ` (${p.year})` : ''}${p.publisher ? ` · ${p.publisher}` : ''}.`,
        ctx,
        sourceUrl: p.url || (p.doi ? `https://doi.org/${p.doi}` : undefined),
      }),
    )
  }
  return claims
}

export function extractClaimsFromRecalls(
  recalls: readonly DrugRecall[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!recalls?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...recalls], ctx.limit ?? 10)) {
    const key = r.recallNumber?.trim() || `${r.reason}-${r.recallDate}`
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'product'
    claims.push(
      buildClaim({
        claimType: 'safety',
        source: OPENFDA_RECALLS_SOURCE,
        naturalKey: key,
        statement: `FDA recall ${r.recallNumber || ''} for ${drug}: ${r.reason || 'reason not stated'}${r.classification ? ` (${r.classification})` : ''}${r.recallingFirm ? ` · firm ${r.recallingFirm}` : ''} — registry row, not incidence.`,
        ctx,
        sourceUrl: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
        quote: r.distribution,
      }),
    )
  }
  return claims
}

export function extractClaimsFromChemblIndications(
  rows: readonly ChemblIndication[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const ind of applyLimit([...rows], ctx.limit ?? 12)) {
    const condition = ind.condition || ind.efoTerm || ind.meshHeading
    if (!condition) continue
    const key = ind.indicationId || `${ind.moleculeChemblId || ind.moleculeName}|${condition}`
    const drug = ctx.moleculeName?.trim() || ind.moleculeName || 'molecule'
    const phase =
      ind.maxPhaseForIndication > 0
        ? ind.maxPhaseForIndication
        : ind.maxPhase > 0
          ? ind.maxPhase
          : null
    claims.push(
      buildClaim({
        claimType: 'indicated-for',
        source: CHEMBL_INDICATION_SOURCE,
        naturalKey: String(key),
        statement: `ChEMBL indication row: ${drug} linked to ${condition}${phase != null ? ` (max phase ${phase})` : ''} — database association, not approval advice.`,
        ctx,
        sourceUrl: ind.url || undefined,
        diseaseId: ind.efoId || ind.meshId || undefined,
      }),
    )
  }
  return claims
}

export function extractClaimsFromDgidb(
  rows: readonly DrugGeneInteraction[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const row of applyLimit([...rows], ctx.limit ?? 12)) {
    const gene = row.geneSymbol?.trim()
    if (!gene) continue
    const drug = ctx.moleculeName?.trim() || row.drugName || 'drug'
    const key = `${drug}|${gene}|${row.interactionType || ''}`
    claims.push(
      buildClaim({
        claimType: 'binds-target',
        source: DGIDB_SOURCE,
        naturalKey: key,
        statement: `DGIdb interaction: ${drug} ↔ ${gene}${row.geneName ? ` (${row.geneName})` : ''}${row.interactionType ? ` · ${row.interactionType}` : ''}${Number.isFinite(row.score) ? ` · score ${row.score}` : ''}.`,
        ctx,
        sourceUrl: row.url || undefined,
        targetId: gene,
        quote: row.evidence?.slice(0, 200),
      }),
    )
  }
  return claims
}

export function extractClaimsFromProperties(
  props: ComputedProperties | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!props) return []
  const drug = ctx.moleculeName?.trim() || 'molecule'
  const parts: string[] = []
  if (props.xLogP != null) parts.push(`xLogP ${props.xLogP}`)
  if (props.tpsa != null) parts.push(`TPSA ${props.tpsa}`)
  if (props.hBondDonorCount != null) parts.push(`HBD ${props.hBondDonorCount}`)
  if (props.hBondAcceptorCount != null) parts.push(`HBA ${props.hBondAcceptorCount}`)
  if (props.rotatableBondCount != null) parts.push(`rotBonds ${props.rotatableBondCount}`)
  if (props.exactMass != null && props.exactMass > 0) parts.push(`exactMass ${props.exactMass}`)
  if (parts.length === 0) return []
  return [
    buildClaim({
      claimType: 'property',
      source: PUBCHEM_PROPERTIES_SOURCE,
      naturalKey: `props:${drug}`,
      statement: `PubChem computed properties for ${drug}: ${parts.join('; ')}.`,
      ctx,
      sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/',
    }),
  ]
}

export function extractClaimsFromOrangeBook(
  rows: readonly OrangeBookRowLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 10)) {
    const key =
      r.applicationNumber ||
      [r.tradeName, r.ingredient, r.patentNumber].filter(Boolean).join('|')
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || r.tradeName || r.ingredient || 'product'
    claims.push(
      buildClaim({
        claimType: 'other',
        source: ORANGE_BOOK_SOURCE,
        naturalKey: String(key),
        statement: `Orange Book row for ${drug}${r.applicationNumber ? ` · ${r.applicationNumber}` : ''}${r.teCode ? ` · TE ${r.teCode}` : ''}${r.applicant ? ` · ${r.applicant}` : ''}${r.patentNumber ? ` · patent ${r.patentNumber}` : ''}${r.patentExpirationDate ? ` exp ${r.patentExpirationDate}` : ''}.`,
        ctx,
        sourceUrl: 'https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files',
      }),
    )
  }
  return claims
}

export function extractClaimsFromDrugLabels(
  rows: readonly DrugLabelRowLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 6)) {
    const key = r.setId || r.title || r.brandName
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || r.brandName || r.genericName || 'product'
    claims.push(
      buildClaim({
        claimType: 'other',
        source: OPENFDA_LABELS_SOURCE,
        naturalKey: String(key),
        statement: `Drug label record for ${drug}: ${r.title || r.brandName || r.genericName || key}${r.labeler ? ` · labeler ${r.labeler}` : ''}. Label text is not clinical advice.`,
        ctx,
        sourceUrl:
          r.url ||
          (r.setId
            ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(r.setId)}`
            : 'https://dailymed.nlm.nih.gov/'),
      }),
    )
  }
  return claims
}

/** Drugs@FDA application rows */
export interface DrugsFdaRowLike {
  applicationNumber?: string
  sponsorName?: string
  brandName?: string
  genericName?: string
  submissionType?: string
  drugsAtFdaUrl?: string
}

export function extractClaimsFromDrugsFda(
  rows: readonly DrugsFdaRowLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 10)) {
    const key = r.applicationNumber || r.brandName
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || r.brandName || r.genericName || 'product'
    claims.push(
      buildClaim({
        claimType: 'other',
        source: DRUGS_FDA_SOURCE,
        naturalKey: String(key),
        statement: `Drugs@FDA application ${r.applicationNumber || key} for ${drug}${r.sponsorName ? ` · sponsor ${r.sponsorName}` : ''}${r.submissionType ? ` · ${r.submissionType}` : ''}${r.brandName ? ` · brand ${r.brandName}` : ''}. Registry fact, not treatment advice.`,
        ctx,
        sourceUrl:
          r.drugsAtFdaUrl ||
          'https://www.accessdata.fda.gov/scripts/cder/daf/',
      }),
    )
  }
  return claims
}

/** openFDA label section snippets */
export interface OpenFdaLabelSectionClaimLike {
  id?: string
  brandName?: string
  genericName?: string
  setId?: string
  dailyMedUrl?: string | null
  sections?: Array<{ key?: string; label?: string; text?: string }>
}

export function extractClaimsFromOpenFdaLabelSections(
  rows: readonly OpenFdaLabelSectionClaimLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  const maxSections = ctx.limit ?? 12
  let n = 0
  for (const r of rows) {
    const drug = ctx.moleculeName?.trim() || r.brandName || r.genericName || 'product'
    for (const s of r.sections ?? []) {
      if (n >= maxSections) return claims
      const text = (s.text || '').trim()
      if (!text) continue
      const key = `${r.id || r.setId || r.brandName}|${s.key || s.label}`
      const isSafety =
        s.key === 'boxed_warning' ||
        s.key === 'adverse_reactions' ||
        s.key === 'warnings_and_cautions' ||
        s.key === 'contraindications' ||
        s.key === 'drug_interactions'
      claims.push(
        buildClaim({
          claimType: isSafety ? 'safety' : 'other',
          source: OPENFDA_LABEL_SECTIONS_SOURCE,
          naturalKey: key,
          statement: `openFDA label section “${s.label || s.key || 'section'}” for ${drug}: ${text.slice(0, 280)}${text.length > 280 ? '…' : ''} — label text only, not incidence.`,
          ctx,
          sourceUrl:
            r.dailyMedUrl ||
            (r.setId
              ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(r.setId)}`
              : 'https://open.fda.gov/apis/drug/label/'),
          quote: text.slice(0, 200),
        }),
      )
      n++
    }
  }
  return claims
}

export interface NsfAwardRowLike {
  id?: string
  title?: string
  piName?: string
  organization?: string
  amount?: number | null
  awardUrl?: string
}

export function extractClaimsFromNsfAwards(
  rows: readonly NsfAwardRowLike[] | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!rows?.length) return []
  const claims: EvidenceClaim[] = []
  for (const r of applyLimit([...rows], ctx.limit ?? 8)) {
    const key = r.id || r.title
    if (!key) continue
    const drug = ctx.moleculeName?.trim() || 'topic'
    claims.push(
      buildClaim({
        claimType: 'literature',
        source: NSF_AWARDS_SOURCE,
        naturalKey: String(key),
        statement: `NSF award related to ${drug}: ${r.title || key}${r.organization ? ` · ${r.organization}` : ''}${r.piName ? ` · PI ${r.piName}` : ''}${r.amount != null ? ` · ~$${Math.round(r.amount).toLocaleString()}` : ''}. Funding context only.`,
        ctx,
        sourceUrl: r.awardUrl || 'https://www.nsf.gov/awardsearch/',
      }),
    )
  }
  return claims
}
