/**
 * Discovery engine public surface.
 */

export type {
  ConfidenceLevel,
  CandidateMolecule,
  DiseaseGene,
  RankResult,
  RankResultWithV2,
  GatheredMolecules,
} from './types'

export { normalizeLog, matchIndication } from './normalize'
export {
  W_CLINICAL_PHASE,
  W_GENE_ASSOCIATION,
  W_SHARED_TARGET,
  W_TRIAL_COUNT,
  computeGeneScore,
  confidenceFromSources,
  scoreLegacyCandidate,
  sortCandidates,
} from './legacyScore'
export {
  rankCandidatesForDisease,
  moleculeNamesFromDiseaseResult,
  OT_KNOWN_DRUGS_DECONTAMINATION_WARNING,
  type RankEngineOptions,
} from './engine'
export { makeSourceStatus, withSourceStatus } from './sourceStatus'
export {
  gatherDiseaseGenes,
  geneSymbolsForDgidb,
  MAX_DGIDB_GENES,
  gatherTargetMolecules,
  gatherTrialDrugs,
  gatherChemblIndications,
} from './sources'

export {
  type DiscoveryPreferences,
  type HarvestTimingPref,
  type AeAggressivenessPref,
  type TourExampleSetPref,
  type CollaborationModePref,
  type DiscoveryPreferencesSnapshot,
  DISCOVERY_PREFS_STORAGE_KEY,
  DEFAULT_DISCOVERY_PREFERENCES,
  snapshotDiscoveryPreferences,
  parseDiscoveryPreferences,
  mergeDiscoveryPreferences,
  scoreRubricFromPreferences,
  harvestFlagsFromPreferences,
  PREFERENCE_TOOLTIPS,
  RUBRIC_PRESET_LABELS,
  loadDiscoveryPreferences,
  saveDiscoveryPreferences,
  resetDiscoveryPreferences,
  updateDiscoveryPreferences,
} from './preferences'

export {
  scoreEfficacy,
  scoreClinicalStage,
  scoreSafety,
  scoreNovelty,
  applyAeAggressiveness,
  buildScoreVector,
  mergeHarvestIntoScoreVector,
  rubricFromPreferences,
  SOFT_FLAG_CLINICAL_STAGE_THRESHOLD,
  SOFT_FLAG_SAFETY_FLOOR,
  NOVELTY_HIT_SCALE,
} from './scoreAxes'

export {
  harvestCandidateAxes,
  HARVEST_K_DEFAULT,
  HARVEST_CONCURRENCY,
  type HarvestCandidateInput,
  type HarvestedCandidate,
  type HarvestResult,
  type HarvestOptions,
} from './harvest'
