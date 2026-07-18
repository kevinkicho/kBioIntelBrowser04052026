/**
 * Pure helpers for Research Hypothesis enrichment (gap map, storyboard, exports, templates).
 * No LLM — deterministic scaffolding for claim-bound RH workflows.
 */

import type {
  EvidenceClaim,
  EvidenceClaimType,
  MoleculeCandidate,
  NextExperiment,
  Project,
  ResearchHypothesis,
  ResearchHypothesisSections,
  ResearchHypothesisStatus,
} from '@/lib/domain'
import { createResearchHypothesis } from './researchHypothesis'

export const RH_STATUS_LABELS: Record<ResearchHypothesisStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  shelved: 'Shelved',
  killed: 'Killed',
  graduated: 'Graduated',
}

export const RH_STATUS_STYLES: Record<ResearchHypothesisStatus, string> = {
  draft: 'border-slate-600 bg-slate-800/50 text-slate-300',
  active: 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300',
  shelved: 'border-amber-800/40 bg-amber-950/30 text-amber-300/90',
  killed: 'border-rose-800/40 bg-rose-950/30 text-rose-300/90',
  graduated: 'border-indigo-700/40 bg-indigo-950/30 text-indigo-300',
}

/** Claim facets we expect for a well-rounded pack/thesis. */
const EXPECTED_FACETS: EvidenceClaimType[] = [
  'mechanism',
  'binds-target',
  'indicated-for',
  'trial',
  'safety',
]

export interface EvidenceGapItem {
  id: string
  facet: string
  severity: 'high' | 'medium' | 'low'
  message: string
  /** Free-public action label */
  suggestedAction: string
  /** Optional deep-link hint key (source mapper) */
  sourceHint?: string
}

/**
 * Deterministic gap map from claim type coverage + board context.
 */
export function buildEvidenceGapMap(input: {
  claims: readonly EvidenceClaim[]
  candidates?: readonly MoleculeCandidate[]
  diseaseName?: string | null
  targetIds?: readonly string[]
}): EvidenceGapItem[] {
  const types = new Set(input.claims.map((c) => c.claimType))
  const gaps: EvidenceGapItem[] = []
  const name =
    input.candidates?.[0]?.identity.name ||
    input.diseaseName ||
    'this candidate'

  for (const facet of EXPECTED_FACETS) {
    if (types.has(facet)) continue
    const meta: Record<
      EvidenceClaimType,
      { severity: EvidenceGapItem['severity']; message: string; action: string; sourceHint: string }
    > = {
      mechanism: {
        severity: 'high',
        message: `No mechanism claims for ${name}.`,
        action: 'Fetch ChEMBL mechanisms for the lead CID and re-export the pack.',
        sourceHint: 'ChEMBL Mechanisms',
      },
      'binds-target': {
        severity: 'high',
        message: `No target-binding claims for ${name}.`,
        action: 'Load ChEMBL activities / DGIdb interactions and re-export.',
        sourceHint: 'ChEMBL',
      },
      'indicated-for': {
        severity: 'medium',
        message: 'No indication / disease-association claims in the claim set.',
        action: 'Run Open Targets disease associations and re-export.',
        sourceHint: 'Open Targets',
      },
      trial: {
        severity: 'high',
        message: `No clinical trial claims for ${name}.`,
        action: 'Search ClinicalTrials.gov for the molecule ± disease and re-extract trials.',
        sourceHint: 'ClinicalTrials.gov',
      },
      safety: {
        severity: 'high',
        message: `No safety / adverse-event claims for ${name}.`,
        action: 'Harvest openFDA AE / DailyMed labels at board promote time.',
        sourceHint: 'OpenFDA (FAERS)',
      },
      property: {
        severity: 'low',
        message: 'No physicochemical property claims.',
        action: 'Open PubChem compound page for properties.',
        sourceHint: 'PubChem',
      },
      literature: {
        severity: 'medium',
        message: 'No literature claims in the pack.',
        action: 'Search Europe PMC / PubMed and attach citable notes.',
        sourceHint: 'EuropePMC',
      },
      other: {
        severity: 'low',
        message: 'Sparse other-facet evidence.',
        action: 'Expand Core panels for promoted CIDs.',
        sourceHint: 'PubChem',
      },
    }
    const m = meta[facet]
    gaps.push({
      id: `gap_${facet}`,
      facet,
      severity: m.severity,
      message: m.message,
      suggestedAction: m.action,
      sourceHint: m.sourceHint,
    })
  }

  const weakId = (input.candidates ?? []).filter(
    (c) => c.identity.identityTrust === 'unresolved' || c.identity.pubchemCid == null,
  )
  if (weakId.length > 0) {
    gaps.push({
      id: 'gap_identity',
      facet: 'identity',
      severity: 'high',
      message: `${weakId.length} linked candidate(s) lack strong structure identity (CID / trust).`,
      suggestedAction: 'Resolve PubChem CID / ChEMBL id before treating the thesis as decision-ready.',
      sourceHint: 'PubChem',
    })
  }

  if (!input.diseaseName?.trim()) {
    gaps.push({
      id: 'gap_disease',
      facet: 'disease',
      severity: 'medium',
      message: 'Project has no confirmed disease name — disease framing is incomplete.',
      suggestedAction: 'Confirm disease on Discover and stamp it onto the project.',
      sourceHint: 'Open Targets',
    })
  }

  if (!input.targetIds?.length) {
    gaps.push({
      id: 'gap_target',
      facet: 'target',
      severity: 'medium',
      message: 'No targets pinned on the project.',
      suggestedAction: 'Pin 1–5 gene targets from Discover / gene pages.',
      sourceHint: 'Open Targets',
    })
  }

  if (input.claims.length === 0) {
    gaps.unshift({
      id: 'gap_empty',
      facet: 'claims',
      severity: 'high',
      message: 'No claims rehydrated — thesis cannot be claim-bound yet.',
      suggestedAction: 'Download an evidence pack from the board, then seed or rebuild claims.',
      sourceHint: 'ChEMBL',
    })
  }

  return gaps
}

export interface StoryboardNode {
  id: string
  kind: 'disease' | 'target' | 'candidate' | 'readout'
  label: string
  claimIds: string[]
}

export interface StoryboardEdge {
  from: string
  to: string
  claimType?: string
  claimIds: string[]
}

/**
 * Lightweight mechanism storyboard: Disease → Target → Candidate → Readout.
 */
export function buildMechanismStoryboard(input: {
  diseaseName?: string | null
  targetIds?: readonly string[]
  candidates?: readonly MoleculeCandidate[]
  claims: readonly EvidenceClaim[]
}): { nodes: StoryboardNode[]; edges: StoryboardEdge[] } {
  const byType = (t: EvidenceClaimType) => input.claims.filter((c) => c.claimType === t)
  const diseaseLabel = input.diseaseName?.trim() || 'Disease (unspecified)'
  const targetLabel = input.targetIds?.[0] || 'Target (unpinned)'
  const cand = input.candidates?.[0]
  const candLabel = cand?.identity.name || 'Candidate (unlinked)'

  const indicated = byType('indicated-for')
  const binds = byType('binds-target')
  const mech = byType('mechanism')
  const trial = byType('trial')
  const safety = byType('safety')
  const readoutClaims = [...trial, ...safety]

  const nodes: StoryboardNode[] = [
    {
      id: 'n_disease',
      kind: 'disease',
      label: diseaseLabel,
      claimIds: indicated.map((c) => c.id),
    },
    {
      id: 'n_target',
      kind: 'target',
      label: targetLabel,
      claimIds: [...binds, ...mech].map((c) => c.id),
    },
    {
      id: 'n_candidate',
      kind: 'candidate',
      label: candLabel,
      claimIds: [...binds, ...mech, ...indicated].map((c) => c.id),
    },
    {
      id: 'n_readout',
      kind: 'readout',
      label: readoutClaims.length
        ? `Trials/safety (${readoutClaims.length})`
        : 'Readout (no trial/safety claims)',
      claimIds: readoutClaims.map((c) => c.id),
    },
  ]

  const edges: StoryboardEdge[] = [
    {
      from: 'n_disease',
      to: 'n_target',
      claimType: 'indicated-for',
      claimIds: indicated.map((c) => c.id),
    },
    {
      from: 'n_target',
      to: 'n_candidate',
      claimType: binds.length ? 'binds-target' : 'mechanism',
      claimIds: [...binds, ...mech].map((c) => c.id),
    },
    {
      from: 'n_candidate',
      to: 'n_readout',
      claimType: trial.length ? 'trial' : 'safety',
      claimIds: readoutClaims.map((c) => c.id),
    },
  ]

  return { nodes, edges }
}

/** Thesis templates (no AI required). */
export type RhTemplateId =
  | 'repurposing'
  | 'target-validation'
  | 'safety-first-kill'
  | 'blank'

export function rhTemplateThesis(
  id: RhTemplateId,
  ctx: { diseaseName?: string; candidateName?: string; targetSymbol?: string },
): { title: string; thesis: string; sections?: ResearchHypothesisSections } {
  const d = ctx.diseaseName || '[disease]'
  const c = ctx.candidateName || '[candidate]'
  const t = ctx.targetSymbol || '[target]'

  switch (id) {
    case 'repurposing':
      return {
        title: `Repurposing ${c} for ${d}`,
        thesis: [
          `Working claim: ${c} may be worth investigating for ${d} via known pharmacology on ${t}, pending safety and trial landscape review.`,
          '',
          'Supporting scaffold: (attach pack claims — mechanism, indication, trials).',
          'Kill criteria: prohibitive AE cluster; no plausible target link; crowded failed trial space without a differentiating angle.',
          'Open questions: dose/exposure in new indication; off-target liabilities; competitive clinical landscape.',
          'Falsifiers: genetic or chemogenomic evidence against the target–disease link; identity mismatch for the candidate.',
        ].join('\n'),
        sections: {
          workingClaim: `${c} is a candidate for investigation in ${d} via ${t}.`,
          killCriteria: [
            'Safety signals incompatible with chronic use in this indication',
            'No mechanistic or genetic support for target–disease link',
          ],
          openQuestions: [
            'Exposure needed vs known human dosing',
            'Differentiation vs existing standard of care',
          ],
          falsifiers: ['Target–disease link disproved by genetic evidence'],
        },
      }
    case 'target-validation':
      return {
        title: `Target validation: ${t} in ${d}`,
        thesis: [
          `Working claim: ${t} is a plausible intervention point in ${d}; ${c} is a chemical tool / probe candidate to test that claim.`,
          '',
          'Supporting scaffold: target association scores, binding/activity claims, mechanism.',
          'Kill criteria: weak disease–target genetics; non-selective probe; no free public binding data.',
          'Next experiments: orthogonal binding assay; pathway readout in disease-relevant cells.',
        ].join('\n'),
        sections: {
          workingClaim: `${t} is worth validating in ${d}; ${c} as chemical probe.`,
          killCriteria: ['Weak genetic support', 'Probe non-selectivity'],
          openQuestions: ['Cell-based pathway readout choice'],
        },
      }
    case 'safety-first-kill':
      return {
        title: `Safety-first triage: ${c}`,
        thesis: [
          `Working claim: Despite interesting MoA for ${d}, ${c} should be held/killed unless safety gaps are closed.`,
          '',
          'Supporting scaffold: AE / label / trial safety claims only for kill decision.',
          'Kill criteria: serious labeled warnings relevant to intended use; high-frequency AE matching disease comorbidity.',
          'Falsifiers of kill: AE signal explained by confounded indication use and not molecule-intrinsic.',
        ].join('\n'),
        sections: {
          workingClaim: `${c} is on a safety-first hold for ${d}.`,
          killCriteria: ['Label/AE cluster incompatible with intended population'],
          falsifiers: ['AE signal confounded by indication, not molecule'],
        },
      }
    default:
      return {
        title: 'Untitled research hypothesis',
        thesis: '',
      }
  }
}

export function seedRhFromTemplate(input: {
  projectId: string
  templateId: RhTemplateId
  project: Pick<Project, 'disease' | 'targetIds' | 'candidates'>
  claimIds?: string[]
  packId?: string
  candidateIds?: string[]
}): ResearchHypothesis {
  const primary = input.project.candidates.find((c) => c.boardStatus === 'promote')
    ?? input.project.candidates[0]
  const tmpl = rhTemplateThesis(input.templateId, {
    diseaseName: input.project.disease?.name,
    candidateName: primary?.identity.name,
    targetSymbol: input.project.targetIds[0],
  })
  const promotedIds = input.project.candidates
    .filter((c) => c.boardStatus === 'promote')
    .map((c) => c.candidateId)
  return createResearchHypothesis({
    projectId: input.projectId,
    title: tmpl.title,
    thesis: tmpl.thesis,
    diseaseId: input.project.disease?.id,
    targetIds: input.project.targetIds,
    candidateIds:
      input.candidateIds ??
      (promotedIds.length ? promotedIds : primary ? [primary.candidateId] : []),
    claimIds: input.claimIds ?? [],
    packId: input.packId,
    status: 'draft',
    role: 'primary',
    sections: tmpl.sections,
  })
}

export function seedRhFromPromoted(input: {
  projectId: string
  project: Project
  claimIds?: string[]
  packId?: string
}): ResearchHypothesis {
  const promoted = input.project.candidates.filter((c) => c.boardStatus === 'promote')
  const names = promoted.map((c) => c.identity.name).join(', ') || '(none promoted)'
  return createResearchHypothesis({
    projectId: input.projectId,
    title: `Promoted shortlist: ${input.project.disease?.name ?? input.project.name}`.slice(0, 200),
    thesis: [
      `Working claim: Promoted candidates (${names}) for ${input.project.disease?.name ?? 'the project disease'} merit a written, claim-bound investigation thesis.`,
      '',
      'Attach pack claims via seed-from-pack or rebuild evidence. Prefer mechanism + safety + trial coverage before activating this hypothesis.',
      '',
      'Kill criteria: identity unresolved; empty safety; no target link.',
    ].join('\n'),
    diseaseId: input.project.disease?.id,
    targetIds: input.project.targetIds,
    candidateIds: promoted.map((c) => c.candidateId),
    claimIds: input.claimIds ?? [],
    packId: input.packId,
    status: 'draft',
    role: 'primary',
  })
}

export function seedRhFromPaste(input: {
  projectId: string
  project: Project
  title?: string
  thesis: string
  claimIds?: string[]
}): ResearchHypothesis {
  return createResearchHypothesis({
    projectId: input.projectId,
    title: (input.title?.trim() || 'Pasted draft thesis').slice(0, 200),
    thesis: input.thesis,
    diseaseId: input.project.disease?.id,
    targetIds: input.project.targetIds,
    candidateIds: input.project.candidates.map((c) => c.candidateId),
    claimIds: input.claimIds ?? [],
    status: 'draft',
    role: 'primary',
  })
}

/** Compose thesis prose from structured sections. */
export function sectionsToThesis(sections: ResearchHypothesisSections): string {
  const parts: string[] = []
  if (sections.workingClaim?.trim()) {
    parts.push(`Working claim: ${sections.workingClaim.trim()}`)
  }
  if (sections.supporting?.length) {
    parts.push('', 'Supporting scaffold:', ...sections.supporting.map((s) => `- ${s}`))
  }
  if (sections.killCriteria?.length) {
    parts.push('', 'Kill criteria:', ...sections.killCriteria.map((s) => `- ${s}`))
  }
  if (sections.openQuestions?.length) {
    parts.push('', 'Open questions:', ...sections.openQuestions.map((s) => `- ${s}`))
  }
  if (sections.falsifiers?.length) {
    parts.push('', 'Falsifiers:', ...sections.falsifiers.map((s) => `- ${s}`))
  }
  if (sections.claimIds?.length) {
    parts.push('', `Claim ids: ${sections.claimIds.join(', ')}`)
  }
  return parts.join('\n')
}

export function researchHypothesisToLabMeetingMd(
  hyp: ResearchHypothesis,
  claims: readonly EvidenceClaim[] = [],
): string {
  const lines: string[] = [
    `# Lab meeting — ${hyp.title}`,
    '',
    `*v${hyp.version} · ${hyp.status ?? 'draft'} · ${new Date(hyp.updatedAt).toISOString().slice(0, 10)}*`,
    '',
    '## Working thesis',
    '',
    hyp.thesis.trim() || '_(empty)_',
    '',
  ]
  if (claims.length) {
    lines.push('## Top evidence (≤5)', '')
    for (const c of claims.slice(0, 5)) {
      lines.push(`- **${c.claimType}** (${c.provenance.source}): ${c.statement}`)
    }
    lines.push('')
  }
  const exps = hyp.nextExperiments ?? []
  if (exps.length) {
    lines.push('## Monday experiments', '')
    for (const e of exps.slice(0, 5)) {
      lines.push(`- **[${e.priority ?? 'medium'}]** ${e.description}`)
      if (e.rationale) lines.push(`  - ${e.rationale}`)
    }
    lines.push('')
  }
  lines.push(
    '---',
    '',
    '_Investigation priority only — not a prediction of clinical success. Free public evidence; cite sources._',
    '',
  )
  return lines.join('\n')
}

export function researchHypothesisToSpecificAimsMd(
  hyp: ResearchHypothesis,
  claims: readonly EvidenceClaim[] = [],
): string {
  const aims = (hyp.nextExperiments ?? []).slice(0, 3)
  const lines: string[] = [
    `# Specific Aims — ${hyp.title}`,
    '',
    '## Overall objective',
    '',
    hyp.sections?.workingClaim?.trim() || hyp.thesis.split('\n')[0] || hyp.thesis.slice(0, 400),
    '',
  ]
  if (aims.length === 0) {
    lines.push(
      '## Aim 1',
      '',
      '_(Add next experiments in the RH editor or run claim-bound AI “Next experiments”.)_',
      '',
    )
  } else {
    aims.forEach((e, i) => {
      lines.push(`## Aim ${i + 1}`, '', e.description, '')
      if (e.rationale) lines.push(`**Rationale.** ${e.rationale}`, '')
      if (e.successCriteria) lines.push(`**Success criteria.** ${e.successCriteria}`, '')
      if (e.failCriteria) lines.push(`**Fail / kill criteria.** ${e.failCriteria}`, '')
      if (e.relatedClaimIds?.length) {
        lines.push(`**Linked claims.** \`${e.relatedClaimIds.join('`, `')}\``, '')
      }
    })
  }
  if (claims.length) {
    lines.push('## Evidence appendix (claim ids)', '')
    for (const c of claims.slice(0, 20)) {
      lines.push(`- \`${c.id}\` — ${c.statement.slice(0, 160)}`)
    }
    lines.push('')
  }
  lines.push(
    '---',
    '',
    '_Draft for internal investigation planning. Not for regulatory use._',
    '',
  )
  return lines.join('\n')
}

export function researchHypothesisToCollaboratorOnePager(
  hyp: ResearchHypothesis,
  project: Pick<Project, 'name' | 'disease' | 'candidates'>,
  claims: readonly EvidenceClaim[] = [],
): string {
  const cands = project.candidates.filter((c) => hyp.candidateIds.includes(c.candidateId))
  const lines: string[] = [
    `# ${hyp.title}`,
    '',
    `**Project:** ${project.name}`,
    project.disease?.name ? `**Disease:** ${project.disease.name}` : '',
    `**Status:** ${hyp.status ?? 'draft'} · v${hyp.version}`,
    '',
    '## Thesis',
    '',
    hyp.thesis.trim() || '_(empty)_',
    '',
    '## Candidates',
    '',
  ]
  if (cands.length === 0) {
    lines.push('_No linked candidates._', '')
  } else {
    for (const c of cands.slice(0, 8)) {
      lines.push(
        `- **${c.identity.name}** (CID ${c.identity.pubchemCid ?? '—'}, ${c.boardStatus ?? 'untriaged'})`,
      )
    }
    lines.push('')
  }
  const types = new Map<string, number>()
  for (const c of claims) types.set(c.claimType, (types.get(c.claimType) ?? 0) + 1)
  if (types.size) {
    lines.push('## Evidence breadth', '')
    const typeRows = Array.from(types.entries()).sort((a, b) => b[1] - a[1])
    for (const [t, n] of typeRows) {
      lines.push(`- ${t}: ${n}`)
    }
    lines.push('')
  }
  if (hyp.sections?.openQuestions?.length) {
    lines.push('## Open questions', '')
    for (const q of hyp.sections.openQuestions) lines.push(`- ${q}`)
    lines.push('')
  }
  lines.push(
    '---',
    '',
    '_Shared as investigation notes from BioIntel (free public sources). Not medical or regulatory advice._',
    '',
  )
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

/** Parse AI next-experiment lines into NextExperiment drafts. */
export function parseNextExperimentsFromInsight(
  nextSteps: string[] | undefined,
  claimIds: string[],
): Omit<NextExperiment, 'id'>[] {
  if (!nextSteps?.length) return []
  return nextSteps.slice(0, 5).map((description, i) => ({
    description: description.slice(0, 2000),
    priority: (i === 0 ? 'high' : i === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    relatedClaimIds: claimIds.slice(0, 5),
    experimentType: 'other' as const,
    costTier: (i === 0 ? 'low' : 'medium') as 'low' | 'medium',
  }))
}
