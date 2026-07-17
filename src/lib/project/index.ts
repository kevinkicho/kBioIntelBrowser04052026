/**
 * Project board library — local store + export/import.
 */

export {
  PROJECT_KEY_PREFIX,
  PROJECT_INDEX_KEY,
  MAX_CANDIDATES_PER_PROJECT,
  MAX_PROJECTS,
  type StoreErrorCode,
  type StoreResult,
  type ProjectStorage,
  type CreateProjectInput,
  projectStorageKey,
  createProject,
  addCandidateToProject,
  setCandidateBoardStatus,
  removeCandidateFromProject,
  isProject,
  listProjects,
  getProject,
  saveProject,
  deleteProject,
  createAndSaveProject,
  addCandidateAndSave,
  setBoardStatusAndSave,
  addPackIndexEntryToProject,
  addPackIndexEntryAndSave,
} from './store'

export { mergeMoleculeCandidate } from '@/lib/domain'

export {
  PROJECT_EXPORT_SCHEMA_VERSION,
  type ProjectExportBundle,
  type ImportErrorCode,
  type ImportResult,
  type ImportOptions,
  exportProjectsToJson,
  exportProjectToJson,
  parseProjectImport,
  importProjects,
  importProjectsFromJson,
  projectExportFilename,
} from './exportImport'

export {
  RESEARCH_HYPOTHESIS_KEY_PREFIX,
  MAX_THESIS_CHARS,
  MAX_HYPOTHESES_PER_PROJECT,
  type CreateResearchHypothesisInput,
  createResearchHypothesis,
  isResearchHypothesis,
  saveResearchHypothesis,
  getResearchHypothesis,
  listResearchHypothesesForProject,
  seedResearchHypothesisFromPack,
  updateResearchHypothesis,
  appendNextExperiment,
} from './researchHypothesis'

export {
  intersectMatchToCandidate,
  sendIntersectMatchesToBoard,
  type SendIntersectToBoardInput,
  type SendIntersectToBoardResult,
} from './bridgeFromIntersect'

export {
  BOARD_HARVEST_MAX,
  candidateNeedsHarvest,
  rubricForProject,
  aeForProject,
  harvestTimingIsBoardPromote,
  harvestCandidatesForBoard,
} from './boardHarvest'

export {
  PACK_MAX_CANDIDATES,
  PACK_CANDIDATE_CONCURRENCY,
  PACK_PANEL_CONCURRENCY,
  PACK_PANEL_TIMEOUT_MS,
  PACK_CATEGORIES,
  selectPackCandidates,
  fetchCorePanelsForCid,
  buildBoardPackClaims,
  type BoardPackClaimsResult,
} from './packClaims'

export {
  PACK_IDB_LRU_MAX,
  putPackInCache,
  getPackFromCache,
  deletePackFromCache,
} from './packCache'

export {
  rehydrateClaimsForHypothesis,
  orderClaimsByIds,
  type RehydrateResult,
} from './rehydrateClaims'
