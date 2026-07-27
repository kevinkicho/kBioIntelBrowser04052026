/**
 * A-tier vs experimental filtering for data hub presentation.
 * Core panels ≈ A-tier research trust; experimental can be hidden.
 */

import { getPanelTier } from '@/lib/panelTiers'
import type { DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

/** Sources treated as A-tier even without panelId */
const A_TIER_SOURCE_RE =
  /pubchem|chembl|clinicaltrials|openfda|faers|uniprot|europe pmc|pubmed|open targets|rxnorm|dailymed|dgidb|orange book|rcsb|pdb|nih reporter/i

export function isATierHubRow(row: DataHubRow): boolean {
  if (row.panelId) {
    const tier = getPanelTier(row.panelId)
    if (tier === 'core') return true
    if (tier === 'experimental') return false
    // supporting: allow if source name is A-tier-ish
  }
  if (A_TIER_SOURCE_RE.test(row.source || '')) return true
  // Identity shell without panel still counts as A-tier structure identity
  if (row.domain === 'identity' && !row.panelId) return true
  return false
}

export function filterHubRowsATier(
  rows: DataHubRow[],
  aTierOnly: boolean,
): DataHubRow[] {
  if (!aTierOnly) return rows
  return rows.filter((r) => isATierHubRow(r) || isDataHubValueEmpty(r.value))
}
