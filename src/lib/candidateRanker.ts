/**
 * Facade over `src/lib/discovery/*`.
 * Existing Discover UI / API imports stay on this module path.
 * Implementation lives in the discovery engine (PR3a extract).
 */

export type {
  ConfidenceLevel,
  CandidateMolecule,
  DiseaseGene,
  RankResult,
  RankResultWithV2,
} from './discovery/types'

export { normalizeLog, matchIndication } from './discovery/normalize'
export {
  rankCandidatesForDisease,
  moleculeNamesFromDiseaseResult,
  OT_KNOWN_DRUGS_DECONTAMINATION_WARNING,
} from './discovery/engine'
