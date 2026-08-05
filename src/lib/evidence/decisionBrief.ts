/**
 * Of-record decision brief — deterministic, no LLM.
 * Summarizes pack claims for lab-meeting / grant framing.
 */

import type { EvidencePack } from './pack'
import { summarizePackHonesty } from './packHonesty'
import { countCitableClaims } from './extractAll'

export interface DecisionBrief {
  schemaVersion: 1
  kind: 'biointel-decision-brief'
  title: string
  exportedAt: string
  packId: string
  contentHash: string
  diseaseName: string | null
  candidateNames: string[]
  claimCount: number
  citableCount: number
  claimTypeCounts: Record<string, number>
  sources: string[]
  /** Top statements (of-record only) */
  topClaims: Array<{ id: string; statement: string; type: string; source: string }>
  killFlags: string[]
  promoteHints: string[]
  honesty: string[]
  law: string[]
}

/**
 * Build a non-AI decision brief from an evidence pack.
 */
export function buildDecisionBrief(
  pack: EvidencePack,
  opts?: { asOf?: string; maxClaims?: number },
): DecisionBrief {
  const maxClaims = opts?.maxClaims ?? 12
  const honesty = summarizePackHonesty(pack.claims)
  const citable = countCitableClaims(pack.claims)
  const typeCounts = { ...pack.claimTypes }
  const killFlags: string[] = []
  const promoteHints: string[] = []

  if (honesty.citableCount < 5) {
    killFlags.push(
      `Soft M3 gap: only ${honesty.citableCount} citable claims (target ≥5) — densify Core extractors before wet-lab.`,
    )
  }
  if (pack.claims.some((c) => c.claimType === 'safety')) {
    promoteHints.push('Safety claims present — review FAERS/recalls/labels as samples, not incidence.')
  } else {
    killFlags.push('No safety-typed claims in pack — run clinical-safety densify before promote.')
  }
  if (pack.claims.some((c) => c.claimType === 'mechanism' || c.claimType === 'binds-target')) {
    promoteHints.push('Mechanistic / target claims present — confirm pins vs Discover of-record scores.')
  }
  if (pack.candidates.length === 0) {
    killFlags.push('No candidates on pack — attach shortlist identities before Monday handoff.')
  } else {
    promoteHints.push(
      `${pack.candidates.length} candidate(s) in pack — board statuses are human decisions only.`,
    )
  }

  const topClaims = [...pack.claims]
    .filter((c) => (c.statement || '').trim().length >= 12)
    .slice(0, maxClaims)
    .map((c) => ({
      id: c.id,
      statement: c.statement,
      type: c.claimType,
      source: c.provenance?.source || 'unknown',
    }))

  return {
    schemaVersion: 1,
    kind: 'biointel-decision-brief',
    title: `Decision brief — ${pack.title}`,
    exportedAt: opts?.asOf || new Date().toISOString(),
    packId: pack.id,
    contentHash: pack.contentHash,
    diseaseName: pack.disease?.name ?? null,
    candidateNames: pack.candidates.map((c) => c.identity?.name || c.candidateId).filter(Boolean),
    claimCount: pack.claimCount,
    citableCount: citable,
    claimTypeCounts: typeCounts,
    sources: [...pack.sources],
    topClaims,
    killFlags,
    promoteHints,
    honesty: honesty.honestyLines,
    law: [
      'Of-record free public APIs only — no LLM text in this brief',
      'Not clinical or regulatory decision support',
      'User verifies primary registry links before wet-lab / grant',
    ],
  }
}

export function decisionBriefToJson(brief: DecisionBrief): string {
  return JSON.stringify(brief, null, 2)
}

export function decisionBriefToMarkdown(brief: DecisionBrief): string {
  const lines: string[] = [
    `# ${brief.title}`,
    '',
    `> Of-record decision brief (schema v${brief.schemaVersion}). Not clinical advice.`,
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Pack | \`${brief.packId}\` |`,
    `| Hash | \`${brief.contentHash.slice(0, 16)}…\` |`,
    `| Claims | ${brief.claimCount} (${brief.citableCount} citable) |`,
    `| Disease | ${brief.diseaseName || '—'} |`,
    `| Candidates | ${brief.candidateNames.join(', ') || '—'} |`,
    '',
    '## Promote / investigate hints',
    '',
    ...brief.promoteHints.map((h) => `- ${h}`),
    '',
    '## Kill / gap flags',
    '',
    ...brief.killFlags.map((h) => `- ${h}`),
    '',
    '## Top claims',
    '',
  ]
  for (const c of brief.topClaims) {
    lines.push(`- **${c.type}** (\`${c.id}\`) · ${c.source}: ${c.statement}`)
  }
  lines.push('', '## Honesty', '')
  for (const h of brief.honesty) lines.push(`- ${h}`)
  lines.push('', '## Law', '')
  for (const l of brief.law) lines.push(`- ${l}`)
  lines.push('')
  return lines.join('\n')
}

export function decisionBriefFilename(brief: DecisionBrief): string {
  const slug = (brief.title || 'brief')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `biointel-decision-brief-${slug}.json`
}
