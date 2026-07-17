/**
 * Evidence claim extractors (PR9) + versioned packs (PR10).
 * Pure DTO → EvidenceClaim[] mappers with mandatory provenance (KD4).
 * Packs are download-primary; localStorage holds index metadata only.
 * @see docs/design/discovery-workbench-v1.md §5.2, §5.4
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
  isCitableClaim,
  countCitableClaims,
} from './extractAll'
export type { CorePanelEvidenceInput, ExtractAllOptions } from './extractAll'

// Versioned evidence packs (PR10)
export {
  EVIDENCE_PACK_SCHEMA_VERSION,
  MAX_PACK_CLAIMS,
  type EvidencePack,
  type BuildEvidencePackInput,
  capPackClaims,
  canonicalizePackBody,
  computePackContentHash,
  buildEvidencePack,
  packToJson,
  packToMarkdown,
  packExportFilename,
  corePanelsFromProfileData,
  isEvidencePack,
  defaultPackRubric,
} from './pack'

export {
  PACK_INDEX_KEY,
  MAX_PACK_INDEX_ENTRIES,
  type PackIndexEntry,
  type PackIndexStorage,
  type PackIndexResult,
  type PackIndexErrorCode,
  isPackIndexEntry,
  toPackIndexEntry,
  toProjectPackIndexEntry,
  listPackIndex,
  registerPackIndex,
  removePackIndexEntry,
  clearPackIndex,
} from './packIndex'
