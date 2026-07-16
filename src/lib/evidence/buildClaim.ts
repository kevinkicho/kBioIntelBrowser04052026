/**
 * Minimal factory for EvidenceClaim with mandatory provenance (KD4).
 */

import type {
  ClaimProvenance,
  EpistemicStatus,
  EvidenceClaim,
  EvidenceClaimType,
} from '@/lib/domain/entities'
import { makeClaimId } from './claimId'
import type { ClaimExtractorContext } from './context'
import { resolveEpistemic } from './context'

export interface BuildClaimInput {
  claimType: EvidenceClaimType
  source: string
  naturalKey: string
  statement: string
  ctx: ClaimExtractorContext
  sourceUrl?: string
  evidenceRefId?: string
  quote?: string
  targetId?: string
  diseaseId?: string
  citations?: EvidenceClaim['citations']
  epistemicStatus?: EpistemicStatus
}

export function buildClaim(input: BuildClaimInput): EvidenceClaim {
  const provenance: ClaimProvenance = {
    source: input.source,
    retrievedAt: input.ctx.retrievedAt,
  }
  if (input.sourceUrl) provenance.sourceUrl = input.sourceUrl
  if (input.evidenceRefId) provenance.evidenceRefId = input.evidenceRefId
  if (input.quote) provenance.quote = input.quote

  const claim: EvidenceClaim = {
    id: makeClaimId(input.claimType, input.source, input.naturalKey),
    statement: input.statement,
    claimType: input.claimType,
    epistemicStatus: input.epistemicStatus ?? resolveEpistemic(input.ctx),
    provenance,
  }

  if (input.ctx.subjectCandidateId) {
    claim.subjectCandidateId = input.ctx.subjectCandidateId
  }
  if (input.targetId) claim.targetId = input.targetId
  if (input.diseaseId) claim.diseaseId = input.diseaseId
  if (input.citations?.length) claim.citations = input.citations

  return claim
}
