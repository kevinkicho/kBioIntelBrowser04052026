/**
 * Shared extractor context — pure functions accept this instead of Date.now().
 */

import type { EpistemicStatus } from '@/lib/domain/entities'

export interface ClaimExtractorContext {
  /**
   * ISO-8601 retrieval timestamp for provenance.retrievedAt.
   * Callers inject (e.g. new Date().toISOString()); tests pin a fixed value.
   */
  retrievedAt: string
  /** Optional molecule candidate id (domain MoleculeCandidate.candidateId). */
  subjectCandidateId?: string
  /** Display name used in human-readable statements. */
  moleculeName?: string
  /** Max claims per extractor call (default: no per-extractor cap). */
  limit?: number
  /**
   * Epistemic status when rows exist. Defaults to 'supported'.
   * Empty input arrays still return [] (no claims to attach).
   */
  epistemicStatus?: EpistemicStatus
}

export function resolveEpistemic(ctx: ClaimExtractorContext): EpistemicStatus {
  return ctx.epistemicStatus ?? 'supported'
}

export function applyLimit<T>(items: T[], limit?: number): T[] {
  if (limit == null || limit < 0) return items
  return items.slice(0, limit)
}
