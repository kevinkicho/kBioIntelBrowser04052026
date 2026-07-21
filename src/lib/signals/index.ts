/**
 * Project-aware count signals + panel deep links (PR14).
 * Reuses @/lib/changeDetection for snapshots and count diffs.
 */

export {
  buildMoleculePanelDeepLink,
  panelAnchorId,
  panelIdFromHash,
  type DeepLinkOptions,
} from './deepLink'

export {
  toSignalItems,
  detectMoleculeSignals,
  detectSignalsFromCounts,
  summariseMoleculeSignals,
  extractTrackedCounts,
  saveSnapshot,
  getSnapshot,
  formatSnapshotAge,
  type SignalItem,
  type DetectSignalsOptions,
  type MoleculeSignalSummary,
} from './detect'

export { fetchTrackedCounts, type FetchCountsResult } from './fetchCounts'

export {
  projectDeepLinkOpts,
  buildCandidateSignalRow,
  loadProjectSignals,
  projectSignalsMembershipKey,
  mergeStickySignalRows,
  type CandidateSignalStatus,
  type CandidateSignalRow,
} from './projectSignals'
