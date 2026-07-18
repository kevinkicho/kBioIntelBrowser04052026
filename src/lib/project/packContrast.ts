/**
 * Multi-pack contrast — pure comparison of two claim sets / pack summaries.
 * Used by RH multi-pack picker (promote A vs contrast B).
 */

import type { EvidenceClaim, EvidenceClaimType, MoleculeCandidate } from '@/lib/domain'
import type { ProjectPackIndexEntry } from '@/lib/domain'
import type { EvidencePack } from '@/lib/evidence/pack'

export interface PackContrastSide {
  packId: string
  title: string
  claimCount: number
  candidateNames: string[]
  claimTypes: Record<string, number>
  sources: string[]
  claimIds: string[]
}

export interface PackContrastResult {
  primary: PackContrastSide
  contrast: PackContrastSide
  /** Claim types in primary but not contrast */
  onlyPrimaryTypes: string[]
  /** Claim types in contrast but not primary */
  onlyContrastTypes: string[]
  sharedTypes: string[]
  /** Sources unique to each side */
  onlyPrimarySources: string[]
  onlyContrastSources: string[]
  sharedSources: string[]
  /** Candidate names unique to each side */
  onlyPrimaryCandidates: string[]
  onlyContrastCandidates: string[]
  sharedCandidates: string[]
  /** Short markdown summary for thesis / AI seed */
  narrative: string
  /** Suggested rival thesis seed */
  rivalSeedThesis: string
}

function countTypes(claims: readonly EvidenceClaim[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const c of claims) {
    m[c.claimType] = (m[c.claimType] ?? 0) + 1
  }
  return m
}

function sideFromPack(pack: EvidencePack): PackContrastSide {
  return {
    packId: pack.id,
    title: pack.title,
    claimCount: pack.claims?.length ?? pack.claimCount ?? 0,
    candidateNames: (pack.candidates ?? []).map((c: MoleculeCandidate) => c.identity.name),
    claimTypes: pack.claimTypes ?? countTypes(pack.claims ?? []),
    sources: pack.sources ?? [],
    claimIds: (pack.claims ?? []).map((c) => c.id).slice(0, 200),
  }
}

function sideFromIndex(
  entry: ProjectPackIndexEntry,
  claims: readonly EvidenceClaim[] = [],
): PackContrastSide {
  const types = countTypes(claims)
  const sources = Array.from(
    new Set(claims.map((c) => c.provenance?.source).filter(Boolean) as string[]),
  )
  return {
    packId: entry.id,
    title: entry.title,
    claimCount: claims.length || entry.claimCount || entry.claimIds?.length || 0,
    candidateNames: [],
    claimTypes: types,
    sources,
    claimIds: claims.length ? claims.map((c) => c.id) : (entry.claimIds ?? []),
  }
}

function setDiff(a: string[], b: string[]): { onlyA: string[]; onlyB: string[]; both: string[] } {
  const A = new Set(a)
  const B = new Set(b)
  const onlyA: string[] = []
  const onlyB: string[] = []
  const both: string[] = []
  Array.from(A).forEach((x) => {
    if (B.has(x)) both.push(x)
    else onlyA.push(x)
  })
  Array.from(B).forEach((x) => {
    if (!A.has(x)) onlyB.push(x)
  })
  return { onlyA, onlyB, both }
}

/**
 * Contrast two full packs (preferred when IDB cache has payloads).
 */
export function contrastEvidencePacks(
  primary: EvidencePack,
  contrast: EvidencePack,
): PackContrastResult {
  return contrastSides(sideFromPack(primary), sideFromPack(contrast))
}

/**
 * Contrast from index entries + optional rehydrated claims (when full pack missing).
 */
export function contrastPackIndexEntries(
  primary: ProjectPackIndexEntry,
  contrast: ProjectPackIndexEntry,
  primaryClaims: readonly EvidenceClaim[] = [],
  contrastClaims: readonly EvidenceClaim[] = [],
): PackContrastResult {
  return contrastSides(
    sideFromIndex(primary, primaryClaims),
    sideFromIndex(contrast, contrastClaims),
  )
}

export function contrastSides(primary: PackContrastSide, contrast: PackContrastSide): PackContrastResult {
  const typesP = Object.keys(primary.claimTypes)
  const typesC = Object.keys(contrast.claimTypes)
  const t = setDiff(typesP, typesC)
  const s = setDiff(primary.sources, contrast.sources)
  const c = setDiff(primary.candidateNames, contrast.candidateNames)

  const typeLine = (side: PackContrastSide) =>
    Object.entries(side.claimTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}:${n}`)
      .join(', ') || '(none)'

  const narrative = [
    `## Pack contrast: “${primary.title}” vs “${contrast.title}”`,
    '',
    `| | Primary | Contrast |`,
    `|---|---|---|`,
    `| Claims | ${primary.claimCount} | ${contrast.claimCount} |`,
    `| Types | ${typeLine(primary)} | ${typeLine(contrast)} |`,
    `| Sources | ${primary.sources.join(', ') || '—'} | ${contrast.sources.join(', ') || '—'} |`,
    `| Candidates | ${primary.candidateNames.join(', ') || '—'} | ${contrast.candidateNames.join(', ') || '—'} |`,
    '',
    t.onlyA.length ? `- Types only in primary: ${t.onlyA.join(', ')}` : '- No unique primary claim types',
    t.onlyB.length ? `- Types only in contrast: ${t.onlyB.join(', ')}` : '- No unique contrast claim types',
    c.onlyA.length ? `- Candidates only in primary: ${c.onlyA.join(', ')}` : '',
    c.onlyB.length ? `- Candidates only in contrast: ${c.onlyB.join(', ')}` : '',
    '',
    '_Use this to write why promote A over B. Investigation priority only._',
  ]
    .filter(Boolean)
    .join('\n')

  const rivalSeedThesis = [
    `Working claim (rival): Evidence in pack “${contrast.title}” may undercut or reframe the primary pack “${primary.title}”.`,
    '',
    `Contrast-only facets: ${t.onlyB.join(', ') || 'none'}.`,
    `Primary-only facets: ${t.onlyA.join(', ') || 'none'}.`,
    '',
    'Kill criteria for primary: if contrast safety/trial signals dominate without differentiating MoA.',
    'Open questions: identity parity across packs; harvest completeness.',
    '',
    narrative,
  ].join('\n')

  return {
    primary,
    contrast,
    onlyPrimaryTypes: t.onlyA,
    onlyContrastTypes: t.onlyB,
    sharedTypes: t.both,
    onlyPrimarySources: s.onlyA,
    onlyContrastSources: s.onlyB,
    sharedSources: s.both,
    onlyPrimaryCandidates: c.onlyA,
    onlyContrastCandidates: c.onlyB,
    sharedCandidates: c.both,
    narrative,
    rivalSeedThesis,
  }
}

/** Facet coverage score for ranking packs as contrast partners (more different = higher). */
export function packContrastDistance(
  a: Pick<PackContrastSide, 'claimTypes' | 'sources'>,
  b: Pick<PackContrastSide, 'claimTypes' | 'sources'>,
): number {
  const typesA = new Set(Object.keys(a.claimTypes))
  const typesB = new Set(Object.keys(b.claimTypes))
  let sym = 0
  Array.from(typesA).forEach((t) => {
    if (!typesB.has(t)) sym++
  })
  Array.from(typesB).forEach((t) => {
    if (!typesA.has(t)) sym++
  })
  const srcA = new Set(a.sources)
  const srcB = new Set(b.sources)
  Array.from(srcA).forEach((s) => {
    if (!srcB.has(s)) sym += 0.5
  })
  Array.from(srcB).forEach((s) => {
    if (!srcA.has(s)) sym += 0.5
  })
  return sym
}

export type { EvidenceClaimType }
