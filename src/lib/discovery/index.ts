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
  snapshotDiscoveryPreferences,
} from './preferences'
