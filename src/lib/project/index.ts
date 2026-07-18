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
  renameProject,
  renameProjectAndSave,
  registerProjectMutateHook,
  type ProjectMutateHook,
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
  deleteResearchHypothesis,
  deleteEmptyClaimResearchHypotheses,
  seedResearchHypothesisFromPack,
  createRivalHypothesis,
  updateResearchHypothesis,
  appendNextExperiment,
} from './researchHypothesis'

export {
  RH_STATUS_LABELS,
  RH_STATUS_STYLES,
  buildEvidenceGapMap,
  buildMechanismStoryboard,
  seedRhFromPaste,
  sectionsToThesis,
  researchHypothesisToLabMeetingMd,
  researchHypothesisToSpecificAimsMd,
  researchHypothesisToCollaboratorOnePager,
  parseNextExperimentsFromInsight,
  type EvidenceGapItem,
  type StoryboardNode,
  type StoryboardEdge,
} from './rhHelpers'

export {
  promotedCandidates,
  selectClaimsForPromoted,
  buildPromotedHypothesisShell,
  applyRhAiInsightToHypothesis,
  generateAndSavePromotedResearchHypothesis,
  type GeneratePromotedRhInput,
  type GeneratePromotedRhResult,
} from './rhAiSeed'

export {
  signalTouchesThesis,
  collectThesisSignalTouches,
  appendSignalNotesToThesis,
  type ThesisSignalTouch,
  type ThesisSignalRelevance,
} from './signalTouchesThesis'

export {
  contrastEvidencePacks,
  contrastPackIndexEntries,
  contrastSides,
  packContrastDistance,
  type PackContrastResult,
  type PackContrastSide,
} from './packContrast'

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
  richnessProxy,
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
