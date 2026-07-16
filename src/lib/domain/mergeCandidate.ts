/**
 * Pure merge of two MoleculeCandidate records (board save / re-save).
 * Preserves identity richness (InChIKey, etc.) and multi-axis scores.
 * @see docs/design/discovery-workbench-v2.md §6.2.3
 */

import type { IdentityTrustLevel } from './identity'
import { mergeAlternateCids } from './identity'
import type {
  BoardStatus,
  CandidateLink,
  MoleculeCandidate,
  MoleculeIdentity,
} from './entities'
import {
  computeComposite,
  createDefaultScoreRubric,
  type ScoreAxisKey,
  type ScoreRubric,
  type ScoreVector,
  type SafetyFlag,
} from './score'

const TRUST_RANK: Record<IdentityTrustLevel, number> = {
  high: 4,
  medium: 3,
  low: 2,
  unresolved: 1,
}

const AXIS_KEYS: ScoreAxisKey[] = [
  'efficacy',
  'clinicalStage',
  'safety',
  'novelty',
  'identityTrust',
]

function preferNonEmpty(a?: string, b?: string): string | undefined {
  const av = a?.trim() || undefined
  const bv = b?.trim() || undefined
  return bv ?? av
}

function preferName(
  existing: string,
  incoming: string,
  existingTrust: IdentityTrustLevel,
  incomingTrust: IdentityTrustLevel,
): string {
  const e = existing?.trim() ?? ''
  const i = incoming?.trim() ?? ''
  if (!e) return i
  if (!i) return e
  // Both non-empty: prefer higher trust on incoming; else longer; else keep existing
  if (TRUST_RANK[incomingTrust] > TRUST_RANK[existingTrust]) return i
  if (i.length > e.length) return i
  return e
}

function preferHigherTrust(
  a: IdentityTrustLevel,
  b: IdentityTrustLevel,
): IdentityTrustLevel {
  return TRUST_RANK[b] > TRUST_RANK[a] ? b : a
}

function preferNonNullNumber(
  existing: number | null | undefined,
  incoming: number | null | undefined,
): number | null {
  if (incoming != null) return incoming
  if (existing != null) return existing
  return null
}

function unionStrings(a: string[] = [], b: string[] = []): string[] {
  return Array.from(new Set([...a, ...b]))
}

function linkKey(link: CandidateLink): string {
  return `${link.type}|${link.targetId ?? ''}|${link.diseaseId ?? ''}`
}

function mergeLinks(existing: CandidateLink[], incoming: CandidateLink[]): CandidateLink[] {
  const map = new Map<string, CandidateLink>()
  for (const l of existing) map.set(linkKey(l), l)
  for (const l of incoming) {
    const k = linkKey(l)
    const prev = map.get(k)
    if (!prev) {
      map.set(k, l)
    } else {
      map.set(k, {
        ...prev,
        ...l,
        evidenceRefIds: unionStrings(prev.evidenceRefIds, l.evidenceRefIds),
      })
    }
  }
  return Array.from(map.values())
}

function safetyFlagKey(f: SafetyFlag): string {
  return `${f.kind}|${f.label}`
}

function mergeSafetyFlags(
  existing?: SafetyFlag[],
  incoming?: SafetyFlag[],
): SafetyFlag[] | undefined {
  if (!existing?.length && !incoming?.length) return undefined
  const map = new Map<string, SafetyFlag>()
  for (const f of existing ?? []) map.set(safetyFlagKey(f), f)
  for (const f of incoming ?? []) map.set(safetyFlagKey(f), f)
  return Array.from(map.values())
}

function mergeScoreVectors(
  existing: ScoreVector | undefined,
  incoming: ScoreVector | undefined,
  projectRubric?: ScoreRubric,
): ScoreVector | undefined {
  if (!existing && !incoming) return undefined
  if (!existing) return incoming
  if (!incoming) return existing

  const axes = { ...existing.axes }
  const axisStatus = { ...existing.axisStatus } as ScoreVector['axisStatus']

  for (const key of AXIS_KEYS) {
    const eVal = existing.axes[key]
    const iVal = incoming.axes[key]
    if (iVal != null) {
      axes[key] = iVal
      axisStatus[key] = incoming.axisStatus[key]
    } else if (eVal != null) {
      axes[key] = eVal
      axisStatus[key] = existing.axisStatus[key]
    } else {
      axes[key] = null
      // Prefer a more informative status when both null
      const iStatus = incoming.axisStatus[key]
      const eStatus = existing.axisStatus[key]
      axisStatus[key] =
        iStatus !== 'not-retrieved' ? iStatus : eStatus
    }
  }

  const weights =
    incoming.weights ?? existing.weights ?? projectRubric?.weights
  const rubric: Pick<ScoreRubric, 'weights' | 'missingAxisPolicy' | 'penalizeValue'> =
    projectRubric
      ? {
          weights: weights ?? projectRubric.weights,
          missingAxisPolicy: projectRubric.missingAxisPolicy,
          penalizeValue: projectRubric.penalizeValue,
        }
      : {
          weights: weights ?? createDefaultScoreRubric('balanced').weights,
          missingAxisPolicy: 'renormalize',
          penalizeValue: undefined,
        }

  const composite = computeComposite(axes, rubric)

  const scorePhase =
    existing.scorePhase === 'full' || incoming.scorePhase === 'full' ? 'full' : 'cheap'

  return {
    composite,
    axes,
    axisStatus,
    rubricVersion: 1,
    rubricId: incoming.rubricId ?? existing.rubricId,
    weights: weights ? { ...weights } : undefined,
    scorePhase,
    safetyFlags: mergeSafetyFlags(existing.safetyFlags, incoming.safetyFlags),
  }
}

function mergeIdentity(
  existing: MoleculeIdentity,
  incoming: MoleculeIdentity,
): MoleculeIdentity {
  const identityTrust = preferHigherTrust(
    existing.identityTrust,
    incoming.identityTrust,
  )
  const pubchemCid = preferNonNullNumber(existing.pubchemCid, incoming.pubchemCid)
  return {
    name: preferName(
      existing.name,
      incoming.name,
      existing.identityTrust,
      incoming.identityTrust,
    ),
    synonyms: unionStrings(existing.synonyms, incoming.synonyms),
    pubchemCid,
    inchiKey: preferNonEmpty(existing.inchiKey, incoming.inchiKey),
    chemblId: preferNonEmpty(existing.chemblId, incoming.chemblId),
    smiles: preferNonEmpty(existing.smiles, incoming.smiles),
    chebiId: preferNonEmpty(existing.chebiId, incoming.chebiId),
    drugbankId: preferNonEmpty(existing.drugbankId, incoming.drugbankId),
    identityTrust,
    alternateCids: mergeAlternateCids(
      pubchemCid,
      existing.alternateCids,
      incoming.alternateCids,
    ),
  }
}

function preferBoardStatus(
  existing?: BoardStatus,
  incoming?: BoardStatus,
): BoardStatus {
  // Board-owned triage: keep existing when set
  if (existing) return existing
  return incoming ?? 'untriaged'
}

/**
 * Merge two candidates with the same board identity.
 * Field rules: design §6.2.3 (prefer non-empty identity keys, union sets, recompute composite).
 */
export function mergeMoleculeCandidate(
  existing: MoleculeCandidate,
  incoming: MoleculeCandidate,
  projectRubric?: ScoreRubric,
): MoleculeCandidate {
  const candidateId =
    (incoming.candidateId?.trim() || existing.candidateId?.trim() || '') as string

  return {
    candidateId,
    identity: mergeIdentity(existing.identity, incoming.identity),
    origins: unionStrings(existing.origins, incoming.origins) as MoleculeCandidate['origins'],
    evidenceBreadthSources: unionStrings(
      existing.evidenceBreadthSources,
      incoming.evidenceBreadthSources,
    ),
    links: mergeLinks(existing.links ?? [], incoming.links ?? []),
    scores: mergeScoreVectors(existing.scores, incoming.scores, projectRubric),
    boardStatus: preferBoardStatus(existing.boardStatus, incoming.boardStatus),
  }
}
