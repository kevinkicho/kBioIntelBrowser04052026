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
  diseaseResultToEntity,
  UnknownDiseaseIdError,
  OT_KNOWN_DRUGS_DECONTAMINATION_WARNING,
  type RankCandidatesOptions,
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
  DEFAULT_DISCOVERY_PREFERENCES,
  DISCOVERY_PREFS_STORAGE_KEY,
  snapshotDiscoveryPreferences,
  parseDiscoveryPreferences,
  mergeDiscoveryPreferences,
  scoreRubricFromPreferences,
  harvestFlagsFromPreferences,
  loadDiscoveryPreferences,
  saveDiscoveryPreferences,
  resetDiscoveryPreferences,
  updateDiscoveryPreferences,
  PREFERENCE_TOOLTIPS,
  TOUR_EXAMPLE_SET_LABELS,
  RUBRIC_PRESET_LABELS,
} from './preferences'

export {
  type TourDiseaseExample,
  TOUR_EXAMPLE_SETS,
  examplesForTourSet,
  diseaseChipLabels,
} from './tourExamples'
