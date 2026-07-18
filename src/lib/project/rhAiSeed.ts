/**
 * Claim-bound AI seed for research hypotheses from promoted board candidates.
 * No boilerplate templates — thesis comes from RH AI grounded in evidence claims.
 */

import type {
  EvidenceClaim,
  MoleculeCandidate,
  Project,
  ResearchHypothesis,
  ResearchHypothesisSections,
} from '@/lib/domain'
import type { RhStructuredInsight } from '@/lib/ai/rhContracts'
import { minClaimsForRhMode } from '@/lib/ai/rhContracts'
import {
  createResearchHypothesis,
  saveResearchHypothesis,
} from './researchHypothesis'
import { sectionsToThesis } from './rhHelpers'

export function promotedCandidates(project: Project): MoleculeCandidate[] {
  return project.candidates.filter((c) => c.boardStatus === 'promote')
}

/**
 * Prefer claims attributed to promoted candidates; fall back to all board claims.
 */
export function selectClaimsForPromoted(
  claims: readonly EvidenceClaim[],
  promoted: readonly MoleculeCandidate[],
): EvidenceClaim[] {
  if (!claims.length) return []
  const ids = new Set(promoted.map((c) => c.candidateId))
  const names = promoted
    .map((c) => c.identity.name.trim().toLowerCase())
    .filter(Boolean)
  const chembls = promoted
    .map((c) => c.identity.chemblId?.toUpperCase())
    .filter(Boolean) as string[]

  const attributed = claims.filter((c) => {
    if (c.subjectCandidateId && ids.has(c.subjectCandidateId)) return true
    const stmt = c.statement.toLowerCase()
    if (names.some((n) => n.length >= 3 && stmt.includes(n))) return true
    if (chembls.some((ch) => c.statement.toUpperCase().includes(ch))) return true
    return false
  })

  const pool = attributed.length > 0 ? attributed : [...claims]
  // Cap for AI context (same spirit as pack AI allowlist)
  return pool.slice(0, 80)
}

export function buildPromotedHypothesisShell(input: {
  project: Project
  claims: EvidenceClaim[]
  packId?: string
}): ResearchHypothesis {
  const promoted = promotedCandidates(input.project)
  const names = promoted.map((c) => c.identity.name).join(', ')
  const disease = input.project.disease?.name ?? input.project.name
  return createResearchHypothesis({
    projectId: input.project.id,
    title: `Promoted shortlist · ${disease}`.slice(0, 200),
    thesis: '', // filled by AI
    diseaseId: input.project.disease?.id,
    targetIds: input.project.targetIds,
    candidateIds: promoted.map((c) => c.candidateId),
    claimIds: input.claims.map((c) => c.id).slice(0, 200),
    packId: input.packId,
    status: 'draft',
    role: 'primary',
  })
}

export function applyRhAiInsightToHypothesis(
  hyp: ResearchHypothesis,
  insight: RhStructuredInsight,
): ResearchHypothesis {
  const sections: ResearchHypothesisSections | undefined = insight.sections
    ? {
        workingClaim: insight.sections.workingClaim,
        supporting: insight.sections.supporting,
        killCriteria: insight.sections.killCriteria,
        openQuestions: insight.sections.openQuestions,
        falsifiers: insight.sections.falsifiers,
        claimIds: insight.claimIds,
      }
    : hyp.sections

  const thesis = sections?.workingClaim
    ? sectionsToThesis({ ...sections, claimIds: insight.claimIds })
    : insight.summary

  const titleFromWorking =
    insight.sections?.workingClaim?.trim().slice(0, 200) ||
    (insight.summary.trim().split(/[.!\n]/)[0] || '').slice(0, 200)

  return {
    ...hyp,
    title: titleFromWorking || hyp.title,
    thesis: thesis.slice(0, 20_000),
    sections,
    claimIds:
      insight.claimIds.length > 0
        ? insight.claimIds.slice(0, 200)
        : hyp.claimIds,
    version: hyp.version + (hyp.thesis ? 1 : 0),
    updatedAt: new Date().toISOString(),
  }
}

export interface GeneratePromotedRhInput {
  project: Project
  /** Board-extracted claims (preferred) */
  boardClaims: readonly EvidenceClaim[]
  packId?: string
  /** Fallback claim ids from pack index when statements unavailable */
  packClaimIds?: string[]
  model: string
  ollamaUrl: string
  ollamaApiKey?: string
}

export interface GeneratePromotedRhResult {
  ok: boolean
  hyp?: ResearchHypothesis
  error?: string
  refused?: boolean
  claimCount: number
  mode: 'rh_thesis_draft'
}

/**
 * Call claim-bound RH AI (thesis draft) for promoted candidates and persist.
 */
export async function generateAndSavePromotedResearchHypothesis(
  input: GeneratePromotedRhInput,
): Promise<GeneratePromotedRhResult> {
  const promoted = promotedCandidates(input.project)
  if (promoted.length === 0) {
    return {
      ok: false,
      error: 'Promote at least one board candidate first.',
      claimCount: 0,
      mode: 'rh_thesis_draft',
    }
  }

  let claims = selectClaimsForPromoted(input.boardClaims, promoted)

  // If we only have pack claim ids without statements, AI cannot ground — refuse honestly
  const minClaims = minClaimsForRhMode('rh_thesis_draft')
  if (claims.length < minClaims) {
    // Try using all board claims if promoted filter was too strict
    if (input.boardClaims.length >= minClaims) {
      claims = input.boardClaims.slice(0, 80)
    }
  }

  if (claims.length < minClaims) {
    return {
      ok: false,
      error: `Need ≥${minClaims} evidence claims from the board pack (have ${claims.length}). Wait for Core panels to load, or download an evidence pack first — AI will not invent a thesis without claims.`,
      claimCount: claims.length,
      mode: 'rh_thesis_draft',
      refused: true,
    }
  }

  const shell = buildPromotedHypothesisShell({
    project: input.project,
    claims,
    packId: input.packId,
  })

  // Placeholder title for context block
  const names = promoted.map((c) => c.identity.name).join(', ')
  shell.thesis = `Draft investigation thesis for promoted candidates (${names}) in ${input.project.disease?.name ?? 'this disease'}. Synthesize only from the provided claims.`

  try {
    const res = await fetch('/api/ai/rh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'rh_thesis_draft',
        hypothesis: {
          id: shell.id,
          title: shell.title,
          thesis: shell.thesis,
          claimIds: shell.claimIds,
          candidateIds: shell.candidateIds,
          status: shell.status,
          role: shell.role,
        },
        claims,
        candidates: promoted,
        disease: input.project.disease ?? null,
        targetIds: input.project.targetIds,
        model: input.model,
        ollamaUrl: input.ollamaUrl,
        ...(input.ollamaApiKey ? { ollamaApiKey: input.ollamaApiKey } : {}),
      }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      insight?: RhStructuredInsight
      refused?: boolean
      refuseReason?: string
      error?: string
    }

    if (data.refused || !data.insight) {
      return {
        ok: false,
        error: data.refuseReason ?? data.error ?? 'RH AI refused or returned empty output',
        claimCount: claims.length,
        mode: 'rh_thesis_draft',
        refused: true,
      }
    }

    const filled = applyRhAiInsightToHypothesis(shell, data.insight)
    // Ensure experiments from insight are not required here — thesis modes use sections

    // Optional: fold nextSteps into open questions if sections thin
    if (
      filled.sections &&
      !filled.sections.openQuestions?.length &&
      data.insight.nextSteps?.length
    ) {
      filled.sections = {
        ...filled.sections,
        openQuestions: data.insight.nextSteps.slice(0, 6),
      }
      filled.thesis = sectionsToThesis({
        ...filled.sections,
        claimIds: data.insight.claimIds,
      })
    }

    const saved = saveResearchHypothesis(filled)
    if (!saved.ok) {
      return {
        ok: false,
        error: saved.message,
        claimCount: claims.length,
        mode: 'rh_thesis_draft',
      }
    }
    return {
      ok: true,
      hyp: saved.value,
      claimCount: claims.length,
      mode: 'rh_thesis_draft',
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Promoted RH AI failed',
      claimCount: claims.length,
      mode: 'rh_thesis_draft',
    }
  }
}
