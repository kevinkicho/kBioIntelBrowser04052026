/**
 * Map board/molecule count signals onto a research hypothesis thesis + claims.
 * Pure — no fetch. Used for live "signal touches thesis" banners.
 */

import type { EvidenceClaim, ResearchHypothesis } from '@/lib/domain'
import type { CandidateSignalRow, SignalItem } from '@/lib/signals'

export type ThesisSignalRelevance =
  | 'safety'
  | 'trial'
  | 'mechanism'
  | 'literature'
  | 'identity'
  | 'other'

export interface ThesisSignalTouch {
  candidateId: string
  name: string
  cid: number
  signal: SignalItem
  relevance: ThesisSignalRelevance
  /** Claim types in the RH that this panel could affect */
  claimTypesTouched: string[]
  /** Thesis keyword hits (lowercased tokens) */
  thesisKeywordsHit: string[]
  /** One-line note suitable to append to thesis */
  suggestedNote: string
  /** Why we flagged this signal for the thesis */
  reason: string
}

const PANEL_RELEVANCE: Record<
  string,
  { relevance: ThesisSignalRelevance; claimTypes: string[]; keywords: string[] }
> = {
  'adverse-events': {
    relevance: 'safety',
    claimTypes: ['safety'],
    keywords: ['safety', 'ae', 'adverse', 'faers', 'toxic', 'bleed', 'risk'],
  },
  recalls: {
    relevance: 'safety',
    claimTypes: ['safety'],
    keywords: ['recall', 'safety', 'label', 'warning'],
  },
  'clinical-trials': {
    relevance: 'trial',
    claimTypes: ['trial'],
    keywords: ['trial', 'phase', 'clinical', 'nct', 'enrollment'],
  },
  chembl: {
    relevance: 'mechanism',
    claimTypes: ['mechanism', 'binds-target'],
    keywords: ['mechanism', 'bind', 'target', 'activity', 'ic50', 'chembl'],
  },
  literature: {
    relevance: 'literature',
    claimTypes: ['literature', 'mechanism'],
    keywords: ['literature', 'paper', 'publication', 'prior art'],
  },
  'nih-reporter': {
    relevance: 'literature',
    claimTypes: ['literature'],
    keywords: ['grant', 'nih', 'funding'],
  },
  patents: {
    relevance: 'literature',
    claimTypes: ['literature', 'other'],
    keywords: ['patent', 'ip', 'prior art'],
  },
  companies: {
    relevance: 'other',
    claimTypes: ['indicated-for', 'other'],
    keywords: ['approved', 'product', 'market'],
  },
  ndc: {
    relevance: 'other',
    claimTypes: ['other'],
    keywords: ['ndc', 'product'],
  },
  pdb: {
    relevance: 'mechanism',
    claimTypes: ['binds-target', 'mechanism'],
    keywords: ['structure', 'pdb', 'binding'],
  },
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 3)
}

/**
 * Score whether a signal is relevant to the current thesis / claims.
 * Always includes safety/trial/chembl deltas for linked candidates; boosts when thesis keywords match.
 */
export function signalTouchesThesis(
  signal: SignalItem,
  hyp: Pick<ResearchHypothesis, 'thesis' | 'title' | 'claimIds'>,
  claims: readonly EvidenceClaim[],
  candidate: { candidateId: string; name: string; cid: number },
): ThesisSignalTouch | null {
  const meta = PANEL_RELEVANCE[signal.panelId] ?? {
    relevance: 'other' as const,
    claimTypes: [] as string[],
    keywords: [] as string[],
  }

  const thesisBlob = `${hyp.title}\n${hyp.thesis}`
  const thesisTokens = new Set(tokenize(thesisBlob))
  const hits = meta.keywords.filter((k) => thesisTokens.has(k) || thesisBlob.toLowerCase().includes(k))

  const claimTypesPresent = new Set(claims.map((c) => c.claimType))
  const claimTypesTouched = meta.claimTypes.filter((t) => claimTypesPresent.has(t as EvidenceClaim['claimType']))

  // Always surface high-impact panels for linked candidates
  const always =
    meta.relevance === 'safety' ||
    meta.relevance === 'trial' ||
    meta.relevance === 'mechanism' ||
    signal.type === 'new'

  if (!always && hits.length === 0 && claimTypesTouched.length === 0) {
    // Still include if thesis mentions candidate name
    if (!thesisBlob.toLowerCase().includes(candidate.name.toLowerCase())) {
      return null
    }
  }

  const delta =
    signal.type === 'new'
      ? `new/increased ${signal.label} (n≈${signal.count})`
      : signal.type === 'removed'
        ? `decreased/removed ${signal.label}`
        : `changed ${signal.label} (n≈${signal.count})`

  const reasonParts: string[] = []
  if (hits.length) reasonParts.push(`thesis keywords: ${hits.join(', ')}`)
  if (claimTypesTouched.length) reasonParts.push(`linked claim types: ${claimTypesTouched.join(', ')}`)
  if (!reasonParts.length) reasonParts.push(`${meta.relevance} panel on linked candidate`)

  const suggestedNote = `[Signal ${new Date().toISOString().slice(0, 10)}] ${candidate.name}: ${delta} — review whether this affects kill criteria / experiments. Panel: ${signal.panelId}.`

  return {
    candidateId: candidate.candidateId,
    name: candidate.name,
    cid: candidate.cid,
    signal,
    relevance: meta.relevance,
    claimTypesTouched,
    thesisKeywordsHit: hits,
    suggestedNote,
    reason: reasonParts.join('; '),
  }
}

/**
 * Collect thesis-relevant signals from project signal rows for RH-linked candidates.
 */
export function collectThesisSignalTouches(
  hyp: Pick<ResearchHypothesis, 'thesis' | 'title' | 'claimIds' | 'candidateIds'>,
  claims: readonly EvidenceClaim[],
  signalRows: readonly CandidateSignalRow[],
  options?: { max?: number },
): ThesisSignalTouch[] {
  const max = options?.max ?? 12
  const linked = new Set(hyp.candidateIds)
  const out: ThesisSignalTouch[] = []

  for (const row of signalRows) {
    if (!linked.has(row.candidateId)) continue
    if (row.cid == null || row.status !== 'ready') continue
    for (const s of row.signals) {
      const touch = signalTouchesThesis(s, hyp, claims, {
        candidateId: row.candidateId,
        name: row.name,
        cid: row.cid,
      })
      if (touch) out.push(touch)
    }
  }

  // Prefer safety/trial first
  const rank: Record<ThesisSignalRelevance, number> = {
    safety: 0,
    trial: 1,
    mechanism: 2,
    literature: 3,
    identity: 4,
    other: 5,
  }
  out.sort((a, b) => rank[a.relevance] - rank[b.relevance])
  return out.slice(0, max)
}

/** Append signal notes to thesis without duplicating identical panel lines. */
export function appendSignalNotesToThesis(
  thesis: string,
  touches: readonly ThesisSignalTouch[],
): string {
  if (!touches.length) return thesis
  const block = [
    '',
    '## Signal review (auto)',
    ...touches.map((t) => `- ${t.suggestedNote} (${t.reason})`),
  ].join('\n')
  if (thesis.includes('## Signal review (auto)')) {
    // append only new lines not already present
    const existing = thesis
    const novel = touches.filter((t) => !existing.includes(t.signal.panelId) || !existing.includes(t.name))
    if (!novel.length) return thesis
    return (
      thesis.trimEnd() +
      '\n' +
      novel.map((t) => `- ${t.suggestedNote} (${t.reason})`).join('\n') +
      '\n'
    )
  }
  return `${thesis.trimEnd()}\n${block}\n`
}
