/**
 * Human explanations for board signal chips.
 * Signals are deterministic free-API count diffs — not LLM ranking.
 */

import { TRACKED_KEYS } from '@/lib/changeDetection'
import type { SignalItem } from './detect'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'

export interface SignalExplainParts {
  /** Short chip hover headline */
  headline: string
  /** Why this badge is on the board row */
  whyShowing: string
  /** What the badge points at */
  pointsAt: string
  /** Algorithm / method (deterministic) */
  algorithm: string
  /** How counts are measured */
  analysis: string
  /** Where the link goes */
  destination: string
  /** Explicit non-AI disclaimer */
  notAi: string
  /** Full multi-line for aria / copy */
  fullText: string
}

function trackMeta(key: string) {
  return TRACKED_KEYS.find((t) => t.key === key)
}

/** Resolve profile category tab for a panel id (for deep-link ?tab=). */
export function categoryIdForPanel(panelId: string): CategoryId | null {
  for (const cat of CATEGORIES) {
    if (cat.panels.some((p) => p.id === panelId)) return cat.id
  }
  return null
}

export function explainSignal(
  signal: SignalItem,
  opts?: { moleculeName?: string; snapshotAge?: string | null },
): SignalExplainParts {
  const meta = trackMeta(signal.key)
  const category = signal.category || meta?.category || 'Profile'
  const label = signal.label || meta?.label || signal.key
  const panelId = signal.panelId || meta?.panelId || 'profile'
  const catId = categoryIdForPanel(panelId)
  const mol = opts?.moleculeName?.trim() || 'this molecule'
  const age = opts?.snapshotAge?.trim() || null

  const typePhrase =
    signal.type === 'new'
      ? `about ${signal.count} more ${label} than your last snapshot`
      : signal.type === 'removed'
        ? `about ${signal.count} fewer ${label} than your last snapshot`
        : `a change of ${signal.count} in ${label}`

  const headline =
    signal.type === 'new'
      ? `+${signal.count} ${label}`
      : signal.type === 'removed'
        ? `−${signal.count} ${label}`
        : `Δ ${signal.count} ${label}`

  const whyShowing = [
    `This chip appears because free-public data counts for ${mol} changed vs the last baseline stored in this browser.`,
    age ? `Baseline age: ${age}.` : 'Baseline is a local snapshot from a prior board or profile visit.',
    'It stays while this candidate remains on the project board (triage status does not clear it).',
  ].join(' ')

  const pointsAt = [
    `It highlights the “${label}” facet (${category} category).`,
    `Type: ${signal.type === 'new' ? 'increase' : signal.type === 'removed' ? 'decrease' : 'change'} — ${typePhrase}.`,
    'That is a count-level heads-up so you can re-open the matching profile panel and re-read the evidence — not a promote/kill recommendation.',
  ].join(' ')

  const algorithm = [
    'Method: deterministic snapshot compare (not an LLM).',
    '1) On a prior visit BioIntel saved array-length counts for tracked free-API fields (e.g. clinicalTrials, adverseEvents) under this PubChem CID in localStorage.',
    '2) On board open it re-fetches the same free categories and recomputes counts.',
    '3) For each tracked field, if currentCount ≠ previousCount, emit a chip with the absolute delta.',
    '4) No ranking model, no “importance” score — only |Δcount| thresholds of zero (any nonzero delta shows).',
  ].join(' ')

  const analysis = [
    'Analysis is raw list cardinality from free APIs (trials list length, AE rows, patent hits, ROR org hits, etc.).',
    'It does not interpret clinical meaning, severity, or causality.',
    'Empty panels that stay empty never produce chips; first observation only sets the baseline (status “—” until a later visit differs).',
  ].join(' ')

  const destination = catId
    ? `Click opens the molecule profile at CID in the URL, selects the “${catId}” category tab, and scrolls to panel “${panelId}”.`
    : `Click opens the molecule profile and tries to scroll to panel “${panelId}”.`

  const notAi =
    'This is not AI advice and not of-record Discover ranking. Optional Pack/Board AI elsewhere may discuss the same molecule, but these chips are pure count diffs from free public APIs.'

  const fullText = [
    headline,
    '',
    'Why it is showing',
    whyShowing,
    '',
    'What it points at',
    pointsAt,
    '',
    'Algorithm',
    algorithm,
    '',
    'Analysis method',
    analysis,
    '',
    'Link target',
    destination,
    '',
    notAi,
  ].join('\n')

  return {
    headline,
    whyShowing,
    pointsAt,
    algorithm,
    analysis,
    destination,
    notAi,
    fullText,
  }
}
