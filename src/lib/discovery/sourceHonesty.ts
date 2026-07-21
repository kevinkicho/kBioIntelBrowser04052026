/**
 * Source honesty matrix — pure builders.
 * Normalizes engine sourceStatuses vs candidate.sources labels so the heatmap
 * can color *multiple* columns (hit / miss) without collapsing on status alone.
 */

import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { DataLoadStatus, SourceFetchStatus } from '@/lib/dataStatus'
import { originSourceDeepLink } from '@/lib/originDeepLinks'

/** Canonical origin family for gather / harvest columns. */
export type CanonicalOriginId =
  | 'dgidb'
  | 'clinicaltrials'
  | 'chembl'
  | 'opentargets'
  | 'orphanet'
  | 'disgenet'
  | 'pubchem'
  | 'openfda'
  | 'europepmc'
  | 'other'

export const CANONICAL_ORIGIN_LABEL: Record<CanonicalOriginId, string> = {
  dgidb: 'DGIdb',
  clinicaltrials: 'ClinicalTrials.gov',
  chembl: 'ChEMBL',
  opentargets: 'Open Targets',
  orphanet: 'Orphanet',
  disgenet: 'DisGeNET',
  pubchem: 'PubChem',
  openfda: 'openFDA',
  europepmc: 'Europe PMC',
  other: 'Other',
}

/** Preferred column order on the honesty matrix. */
export const CANONICAL_ORIGIN_ORDER: CanonicalOriginId[] = [
  'opentargets',
  'dgidb',
  'chembl',
  'clinicaltrials',
  'orphanet',
  'disgenet',
  'pubchem',
  'openfda',
  'europepmc',
  'other',
]

/**
 * Map any engine / pill label to a canonical origin id.
 */
export function canonicalizeOrigin(raw: string | null | undefined): CanonicalOriginId {
  const s = String(raw || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return 'other'
  if (s.includes('dgidb') || s.includes('drug-gene') || s.includes('drug gene')) return 'dgidb'
  if (s.includes('clinicaltrial') || s.includes('clinical trial') || s.includes('ct.gov') || s === 'isrctn')
    return 'clinicaltrials'
  if (s.includes('chembl')) return 'chembl'
  if (s.includes('open target') || s.includes('opentarget') || s.includes('known drug'))
    return 'opentargets'
  if (s.includes('orphan')) return 'orphanet'
  if (s.includes('disgenet')) return 'disgenet'
  if (s.includes('pubchem') || s.includes('similarity')) return 'pubchem'
  if (s.includes('openfda') || s.includes('faers') || s.includes('adverse') || s.includes('recall'))
    return 'openfda'
  if (s.includes('europepmc') || s.includes('europe pmc') || s.includes('novelty')) return 'europepmc'
  return 'other'
}

export type HonestyCellKind = 'hit' | 'miss' | 'source_error' | 'source_empty' | 'source_disabled'

export interface HonestyColumn {
  id: CanonicalOriginId
  label: string
  /** Upstream gather/harvest status for this family (if any) */
  upstreamStatus?: DataLoadStatus
  upstreamError?: string
  /** Raw engine source labels that folded into this column */
  rawLabels: string[]
  hitCount: number
  /** External deep-link for the source (disease/context aware) */
  href: string | null
  hrefTitle: string
}

export interface HonestyRow {
  name: string
  rank: number
  cid: number | null
  origins: CanonicalOriginId[]
  cells: Record<CanonicalOriginId, HonestyCellKind>
  /** DOM id for scroll-to-card */
  anchorId: string
}

export interface SourceHonestyMatrix {
  columns: HonestyColumn[]
  rows: HonestyRow[]
  /** Distinct origin families with ≥1 hit across shortlist */
  originsWithHits: number
  totalHits: number
  notes: string[]
}

function mergeStatus(
  a: DataLoadStatus | undefined,
  b: DataLoadStatus,
): DataLoadStatus {
  if (!a) return b
  const rank: Record<DataLoadStatus, number> = {
    error: 0,
    timeout: 1,
    disabled: 2,
    empty: 3,
    loaded: 4,
  }
  return rank[b] < rank[a] ? b : a
}

/**
 * Build candidate × origin honesty matrix with normalized columns.
 */
export function buildSourceHonestyMatrix(input: {
  candidates: CandidateMolecule[]
  sourceStatuses?: SourceFetchStatus[]
  maxCandidates?: number
  diseaseName?: string | null
}): SourceHonestyMatrix {
  const maxCandidates = input.maxCandidates ?? 15
  const rowsIn = input.candidates.slice(0, maxCandidates)
  const statuses = input.sourceStatuses ?? []

  // Collect raw labels from statuses + candidates
  const rawByCanon = new Map<CanonicalOriginId, Set<string>>()
  const statusByCanon = new Map<
    CanonicalOriginId,
    { status: DataLoadStatus; error?: string }
  >()

  const addRaw = (raw: string) => {
    const id = canonicalizeOrigin(raw)
    if (!rawByCanon.has(id)) rawByCanon.set(id, new Set())
    rawByCanon.get(id)!.add(raw)
  }

  for (const st of statuses) {
    if (!st.source) continue
    addRaw(st.source)
    const id = canonicalizeOrigin(st.source)
    const prev = statusByCanon.get(id)
    statusByCanon.set(id, {
      status: mergeStatus(prev?.status, st.status),
      error: st.error || prev?.error,
    })
  }
  for (const c of rowsIn) {
    for (const s of c.sources ?? []) addRaw(String(s))
  }

  // Prefer known gather columns even if only present on some candidates
  const columnIds = CANONICAL_ORIGIN_ORDER.filter((id) => {
    if (id === 'other') return (rawByCanon.get('other')?.size ?? 0) > 0
    return rawByCanon.has(id) || statusByCanon.has(id)
  })

  // Always show core gather columns when we have any candidates (honesty empty state clarity)
  if (rowsIn.length > 0 && columnIds.length === 0) {
    columnIds.push('opentargets', 'dgidb', 'chembl', 'clinicaltrials')
  }

  const rows: HonestyRow[] = rowsIn.map((c, i) => {
    const origins = Array.from(
      new Set((c.sources ?? []).map((s) => canonicalizeOrigin(String(s)))),
    )
    const cells = {} as Record<CanonicalOriginId, HonestyCellKind>
    for (const col of columnIds) {
      const up = statusByCanon.get(col)
      if (up?.status === 'error' || up?.status === 'timeout') {
        // Source failed globally — still mark hit if candidate somehow lists it
        cells[col] = origins.includes(col) ? 'hit' : 'source_error'
        continue
      }
      if (up?.status === 'disabled') {
        cells[col] = origins.includes(col) ? 'hit' : 'source_disabled'
        continue
      }
      // empty upstream means gather returned nothing *for the disease*, not that this molecule missed
      if (origins.includes(col)) {
        cells[col] = 'hit'
      } else if (up?.status === 'empty') {
        cells[col] = 'source_empty'
      } else {
        cells[col] = 'miss'
      }
    }
    return {
      name: c.name,
      rank: i + 1,
      cid: c.cid,
      origins,
      cells,
      anchorId: discoverCandidateAnchorId(i + 1, c.name),
    }
  })

  const columns: HonestyColumn[] = columnIds.map((id) => {
    const hitCount = rows.filter((r) => r.cells[id] === 'hit').length
    const rawLabels = Array.from(rawByCanon.get(id) ?? [CANONICAL_ORIGIN_LABEL[id]])
    const up = statusByCanon.get(id)
    const link = originSourceDeepLink(CANONICAL_ORIGIN_LABEL[id], {
      diseaseName: input.diseaseName,
      name: input.diseaseName,
    })
    return {
      id,
      label: CANONICAL_ORIGIN_LABEL[id],
      upstreamStatus: up?.status,
      upstreamError: up?.error,
      rawLabels,
      hitCount,
      href: link.href,
      hrefTitle: link.title,
    }
  })

  let totalHits = 0
  const originsWithHits = new Set<CanonicalOriginId>()
  for (const r of rows) {
    for (const col of columnIds) {
      if (r.cells[col] === 'hit') {
        totalHits++
        originsWithHits.add(col)
      }
    }
  }

  const notes: string[] = [
    'Green = this shortlist molecule was gathered from that free public source.',
    'Grey miss = source ran but this name did not appear there.',
    'Dim empty / red = upstream source empty or failed for the whole disease run (not per-molecule).',
  ]
  if (originsWithHits.size <= 1 && rows.length > 0) {
    notes.push(
      'Few origins contributed — widen gather (targets, known drugs, trials) or check Source status above.',
    )
  }

  return {
    columns,
    rows,
    originsWithHits: originsWithHits.size,
    totalHits,
    notes,
  }
}

export function discoverCandidateAnchorId(rank: number, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `discover-candidate-${rank}-${slug || 'row'}`
}

export function honestyCellLabel(kind: HonestyCellKind): string {
  switch (kind) {
    case 'hit':
      return 'Hit — molecule listed this origin'
    case 'miss':
      return 'Miss — origin ran; this molecule not from it'
    case 'source_empty':
      return 'Upstream empty — gather returned no data for disease'
    case 'source_error':
      return 'Upstream error/timeout'
    case 'source_disabled':
      return 'Upstream disabled'
    default:
      return kind
  }
}
