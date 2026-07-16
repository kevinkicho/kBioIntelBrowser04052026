/**
 * Stable EvidenceClaim ids (pure, content-addressed).
 * @see docs/design/discovery-workbench-v1.md KD4 / PR9
 */

import { sha256Hex } from '@/lib/domain/sha256'
import type { EvidenceClaimType } from '@/lib/domain/entities'

/** Prefix for all claim ids — packs / AI validation can detect claim refs. */
export const CLAIM_ID_PREFIX = 'ec:'

/**
 * Build a stable claim id from type + source + natural key.
 * Same inputs always yield the same id (content-addressed).
 */
export function makeClaimId(
  claimType: EvidenceClaimType,
  source: string,
  naturalKey: string,
): string {
  const key = `${claimType}|${source}|${naturalKey}`
  const digest = sha256Hex(key).slice(0, 16)
  return `${CLAIM_ID_PREFIX}${digest}`
}

export function isClaimId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(CLAIM_ID_PREFIX) && id.length === CLAIM_ID_PREFIX.length + 16
}
