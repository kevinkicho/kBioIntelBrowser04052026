/**
 * Pure builder: multi-source factual ledger for a molecule profile.
 * Orchestrates modular section builders in moleculeHubSections.ts.
 * No network; uses identity props + category DTO bags already on the page.
 */

import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubLedger,
} from './types'
import type { MoleculeIdentityInput } from './moleculeHubShared'
import { buildMoleculeHubParts } from './moleculeHubSections'
import { hashDataHubLedger } from './contentHash'

export type { MoleculeIdentityInput } from './moleculeHubShared'

/**
 * Build a factual multi-source data hub ledger for one molecule.
 */
export function buildMoleculeDataHub(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): DataHubLedger {
  const subjectId = String(identity.cid)
  const subjectLabel = identity.name || `CID ${identity.cid}`
  const { rows: all, sections } = buildMoleculeHubParts(identity, data)
  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  const empty = nonEmpty.length <= 2
  const contentHash = hashDataHubLedger({
    subjectId,
    subjectLabel,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty,
    notes: [],
  })

  return {
    subjectId,
    subjectLabel,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty,
    notes: [
      'Facts are copied from free public APIs retrieved for this page — not model-generated claims.',
      'Counts and samples reflect what loaded in this session; Refresh re-queries sources.',
      'Empty / not-retrieved rows are of-record negative evidence — not “no association.”',
      `Content hash: ${contentHash}`,
      'Not for clinical or regulatory decision support. Verify in primary sources before wet-lab or grant use.',
    ],
  }
}
