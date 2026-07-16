/**
 * Evidence claim extractors (PR9).
 * Pure DTO → EvidenceClaim[] mappers with mandatory provenance (KD4).
 * @see docs/design/discovery-workbench-v1.md §5.2
 */

// Domain wire types re-exported for consumers
export type {
  EvidenceClaim,
  EvidenceClaimType,
  ClaimProvenance,
  EpistemicStatus,
} from '@/lib/domain/entities'

export { CLAIM_ID_PREFIX, makeClaimId, isClaimId } from './claimId'
export type { ClaimExtractorContext } from './context'
export { resolveEpistemic, applyLimit } from './context'
export { buildClaim } from './buildClaim'
export type { BuildClaimInput } from './buildClaim'

export {
  extractClaimsFromChemblActivities,
  CHEMBL_ACTIVITY_SOURCE,
  extractClaimsFromChemblMechanisms,
  CHEMBL_MECHANISM_SOURCE,
  extractClaimsFromAdverseEvents,
  OPENFDA_AE_SOURCE,
  extractClaimsFromClinicalTrials,
  CLINICAL_TRIALS_SOURCE,
  extractClaimsFromOpenTargets,
  OPEN_TARGETS_SOURCE,
} from './extractors'

export {
  DEFAULT_CLAIM_TOTAL_CAP,
  extractClaimsFromCorePanels,
  dedupeClaimsById,
  countClaimsByType,
  claimSourceNames,
} from './extractAll'
export type { CorePanelEvidenceInput, ExtractAllOptions } from './extractAll'
