/**
 * Deterministic claims from a research-lab dossier for claim-bound AI.
 * claimType: other — affiliation / registry facts only.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import { buildClaim } from '@/lib/evidence/buildClaim'
import type { ClaimExtractorContext } from '@/lib/evidence/context'
import type { ResearchLabDossier } from './types'
import { buildEvidencePack, type EvidencePack } from '@/lib/evidence/pack'

export const RESEARCH_LAB_SOURCE = 'BioIntel research-lab dossier (free public joins)'

export function extractClaimsFromResearchLabDossier(
  dossier: ResearchLabDossier,
  ctx?: Partial<ClaimExtractorContext>,
): EvidenceClaim[] {
  const retrievedAt = ctx?.retrievedAt ?? dossier.builtAt
  const base: ClaimExtractorContext = {
    retrievedAt,
    moleculeName: dossier.name,
    subjectCandidateId: ctx?.subjectCandidateId,
  }
  const claims: EvidenceClaim[] = []
  const name = dossier.name

  claims.push(
    buildClaim({
      claimType: 'other',
      source: RESEARCH_LAB_SOURCE,
      naturalKey: `summary:${name}`,
      statement: `Research institution dossier for “${name}” (kind: ${dossier.kind}): ${dossier.stats.rorCount} ROR, ${dossier.stats.openAlexCount} OpenAlex institutions, ${dossier.stats.collegeCount} US colleges, ${dossier.stats.hospitalCount} CMS hospitals, ${dossier.stats.grantCount} NIH RePORTER rows, ${dossier.stats.openAireCount} OpenAIRE rows, ${dossier.stats.edgeCount} affiliation edges; OpenAlex works hint ${dossier.stats.totalWorksHint}. Not admissions or clinical referral.`,
      ctx: base,
      sourceUrl: dossier.deepLinks[0]?.url || 'https://ror.org/',
      quote: dossier.query ? `Query: ${dossier.query}` : undefined,
    }),
  )

  for (const o of dossier.rorOrgs.slice(0, 10)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `ror:${o.rorId}`,
        statement: `ROR research organization: ${o.name}${o.city || o.countryName ? ` (${[o.city, o.countryName].filter(Boolean).join(', ')})` : ''}; types: ${o.types.slice(0, 4).join('/') || 'n/a'}.`,
        ctx: base,
        sourceUrl: `https://ror.org/${o.rorId}`,
        quote: o.matchSource ? `Match: ${o.matchSource}` : undefined,
      }),
    )
  }

  for (const i of dossier.openAlexInstitutions.slice(0, 8)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `openalex:${i.openAlexId}`,
        statement: `OpenAlex institution: ${i.name}${i.worksCount != null ? ` · ~${i.worksCount} works` : ''}${i.rorId ? ` · ROR ${i.rorId}` : ''}.`,
        ctx: base,
        sourceUrl: i.openAlexUrl,
        quote: i.type || undefined,
      }),
    )
  }

  for (const c of dossier.colleges.slice(0, 6)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `college:${c.id}`,
        statement: `US college record: ${c.name}${c.city || c.state ? ` (${[c.city, c.state].filter(Boolean).join(', ')})` : ''}${c.ownership ? ` · ${c.ownership}` : ''}${c.source ? ` · source ${c.source}` : ''}.`,
        ctx: base,
        sourceUrl: c.scorecardUrl,
      }),
    )
  }

  for (const h of dossier.hospitals.slice(0, 5)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `hospital:${h.facilityId || h.facilityName}`,
        statement: `CMS Medicare hospital record: ${h.facilityName}${h.city || h.state ? ` (${[h.city, h.state].filter(Boolean).join(', ')})` : ''}${h.hospitalType ? ` · ${h.hospitalType}` : ''}.`,
        ctx: base,
        sourceUrl: h.careCompareUrl,
      }),
    )
  }

  // Grant institutes rollup
  const byInst = new Map<string, number>()
  for (const g of dossier.grants) {
    const inst = g.institute?.trim()
    if (!inst || /^unknown$/i.test(inst)) continue
    byInst.set(inst, (byInst.get(inst) || 0) + 1)
  }
  for (const [inst, count] of Array.from(byInst.entries()).slice(0, 8)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `grant-inst:${inst}`,
        statement: `NIH RePORTER organization row for ${name} neighborhood: ${inst} (${count} project listing${count === 1 ? '' : 's'}).`,
        ctx: base,
        sourceUrl: 'https://reporter.nih.gov/',
      }),
    )
  }

  for (const g of dossier.grants.slice(0, 6)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `grant:${g.projectNumber || g.title}`,
        statement: `NIH project linked to dossier query: ${g.title || g.projectNumber}${g.piName ? ` · PI ${g.piName}` : ''}${g.institute ? ` · ${g.institute}` : ''}.`,
        ctx: base,
        sourceUrl: g.projectNumber
          ? `https://reporter.nih.gov/project-details/${encodeURIComponent(g.projectNumber)}`
          : 'https://reporter.nih.gov/',
      }),
    )
  }

  for (const e of dossier.affiliationEdges.slice(0, 8)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: RESEARCH_LAB_SOURCE,
        naturalKey: `edge:${e.id}`,
        statement: `Affiliation name-overlap (${e.kind}, score ${(e.score * 100).toFixed(0)}%): ${e.leftLabel} ↔ ${e.rightLabel}.`,
        ctx: base,
        sourceUrl: e.rightHref || e.leftHref || 'https://ror.org/',
        quote: e.detail,
      }),
    )
  }

  return claims
}

/** Build a versioned evidence pack for Pack AI / download. */
export function researchLabDossierToEvidencePack(
  dossier: ResearchLabDossier,
): EvidencePack {
  const claims = extractClaimsFromResearchLabDossier(dossier)
  return buildEvidencePack({
    title: `${dossier.name} research-lab dossier`,
    claims,
    candidates: [],
    createdAt: dossier.builtAt,
    maxClaims: 200,
  })
}
