/**
 * Domain wire types for Discovery Workbench (Rev 3).
 * Pure types + helpers — no UI.
 */

// Identity
export {
  type IdentityTrust,
  type IdentityTrustLevel,
  type IdentityKeys,
  type IdentityTrustAssessment,
  IDENTITY_TRUST_AXIS_VALUES,
  normalizeInchiKey,
  isValidInchiKey,
  normalizeChemblId,
  normalizeCid,
  identityTrustToAxisValue,
  assessIdentityTrust,
  mergeAlternateCids,
} from './identity'

// Score
export {
  type ScorePhase,
  type ScoreAxisKey,
  type AxisStatus,
  type RubricPresetId,
  type MissingAxisPolicy,
  type AeAggressiveness,
  type ScoreAxisWeights,
  type ScoreRubric,
  type SafetyFlagKind,
  type SafetyFlagSeverity,
  type SafetyFlag,
  type ScoreVector,
  type OverallScore,
  RUBRIC_PRESETS,
  DEFAULT_PENALIZE_VALUE,
  createDefaultScoreRubric,
  createEmptyScoreVector,
  clampAxis,
  computeComposite,
} from './score'

// Candidate id
export {
  type CandidateIdKind,
  type ParsedCandidateId,
  type CandidateIdInput,
  normalizeCandidateName,
  hashNormalizedName,
  computeCandidateId,
  parseCandidateId,
  canonicalizeCandidateId,
  candidateIdsEqual,
  preferCandidateId,
} from './candidateId'

// Entities
export {
  type EpistemicStatus,
  type BoardStatus,
  type DiseaseIdNamespace,
  type DiseaseEntity,
  type TargetEntity,
  type CandidateOrigin,
  type MoleculeIdentity,
  type CandidateLinkType,
  type CandidateLink,
  type MoleculeCandidate,
  type ClaimProvenance,
  type EvidenceClaimType,
  type EvidenceClaim,
  type NextExperiment,
  type ResearchHypothesisStatus,
  type ResearchHypothesisRole,
  type ResearchHypothesisSections,
  type ResearchHypothesis,
  type ProjectPackIndexEntry,
  type ProjectPreferencesSnapshot,
  type Project,
  type Disease,
  type Target,
} from './entities'

// Discovery result + dual schema
export {
  type DiscoveryPreferencesSnapshot,
  type DiscoveryTimingStage,
  type DiscoveryResult,
  type RankResultWithV2,
  type RankResult,
  type CandidateMolecule as LegacyCandidateMolecule,
  type DiseaseGene,
  type SourceFetchStatus,
  createEmptyDiscoveryResult,
  isDiscoveryResult,
  getDiscoveryV2,
} from './discoveryResult'

// Mappers
export {
  mapLegacyCandidateToMoleculeCandidate,
  mapRankResultToDiscoveryResult,
} from './mappers'

// Candidate merge (board save)
export { mergeMoleculeCandidate } from './mergeCandidate'

// Discovery preferences (types + defaults + pure helpers; re-export for domain entrypoint)
export {
  type DiscoveryPreferences,
  type HarvestTimingPref,
  type AeAggressivenessPref,
  type TourExampleSetPref,
  type CollaborationModePref,
  DISCOVERY_PREFS_STORAGE_KEY,
  DEFAULT_DISCOVERY_PREFERENCES,
  snapshotDiscoveryPreferences,
  parseDiscoveryPreferences,
  mergeDiscoveryPreferences,
  scoreRubricFromPreferences,
  harvestFlagsFromPreferences,
  PREFERENCE_TOOLTIPS,
  RUBRIC_PRESET_LABELS,
} from '../discovery/preferences'
