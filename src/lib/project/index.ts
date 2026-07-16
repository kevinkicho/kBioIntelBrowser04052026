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
} from './store'

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
