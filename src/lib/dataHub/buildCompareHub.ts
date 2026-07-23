/**
 * Side-by-side multi-CID data hub matrix for /compare.
 * Pure — no network. Aligns fact ids across molecule ledgers.
 */

import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'
import { buildMoleculeDataHub, type MoleculeIdentityInput } from './buildMoleculeDataHub'

export interface CompareHubColumn {
  subjectId: string
  subjectLabel: string
  ledger: DataHubLedger
}

export interface CompareHubMatrixCell {
  value: string
  source?: string
  sourceUrl?: string
  detail?: string
  empty: boolean
}

export interface CompareHubMatrixRow {
  factId: string
  fact: string
  sectionId: string
  sectionTitle: string
  /** Consensus source label when all agree, else “multi” */
  sourceHint: string
  cells: CompareHubMatrixCell[]
}

export interface CompareHubMatrix {
  columns: Array<{ subjectId: string; subjectLabel: string; sourceCount: number }>
  rows: CompareHubMatrixRow[]
  /** Distinct fact ids with at least one non-empty cell */
  filledFactCount: number
  notes: string[]
}

/** Map compare page MoleculeData-shaped bags into hub builder input. */
export function compareBagsFromMoleculeData(data: {
  clinicalTrials?: unknown[]
  trials?: unknown[]
  adverseEvents?: unknown[]
  orangeBookEntries?: unknown[]
  ndcProducts?: unknown[]
  drugLabels?: unknown[]
  chemblActivities?: unknown[]
  chemblMechanisms?: unknown[]
  chemblIndications?: unknown[]
  literature?: unknown[]
  nihGrants?: unknown[]
  semanticPapers?: unknown[]
  patents?: unknown[]
  pdbStructures?: unknown[]
  uniprotEntries?: unknown[]
  drugRecalls?: unknown[]
  drugGeneInteractions?: unknown[]
  mychemAnnotations?: unknown[]
  atcClassifications?: unknown[]
}): Record<string, unknown> {
  return {
    clinicalTrials: data.clinicalTrials ?? data.trials ?? [],
    adverseEvents: data.adverseEvents ?? [],
    orangeBookEntries: data.orangeBookEntries ?? [],
    ndcProducts: data.ndcProducts ?? [],
    drugLabels: data.drugLabels ?? [],
    chemblActivities: data.chemblActivities ?? [],
    chemblMechanisms: data.chemblMechanisms ?? [],
    chemblIndications: data.chemblIndications ?? [],
    literature: data.literature ?? [],
    nihGrants: data.nihGrants ?? [],
    semanticPapers: data.semanticPapers ?? [],
    patents: data.patents ?? [],
    pdbStructures: data.pdbStructures ?? [],
    uniprotEntries: data.uniprotEntries ?? [],
    drugRecalls: data.drugRecalls ?? [],
    drugGeneInteractions: data.drugGeneInteractions ?? [],
    mychemAnnotations: data.mychemAnnotations ?? [],
    atcClassifications: data.atcClassifications ?? [],
  }
}

export function buildLedgerForCompare(
  identity: MoleculeIdentityInput,
  bags: Record<string, unknown>,
): DataHubLedger {
  return buildMoleculeDataHub(identity, bags)
}

function sectionTitleFor(ledger: DataHubLedger, rowId: string): { id: string; title: string } {
  for (const s of ledger.sections) {
    if (s.rowIds.includes(rowId)) return { id: s.id, title: s.title }
  }
  return { id: 'other', title: 'Other' }
}

/**
 * Align multiple ledgers into a fact × molecule matrix.
 * Fact order follows the first column’s section order, then appends novel facts.
 */
export function buildCompareHubMatrix(columns: CompareHubColumn[]): CompareHubMatrix {
  if (columns.length === 0) {
    return {
      columns: [],
      rows: [],
      filledFactCount: 0,
      notes: ['Select at least two molecules to compare public-record facts.'],
    }
  }

  const byCol = columns.map((c) => {
    const m = new Map<string, DataHubRow>()
    for (const r of c.ledger.rows) m.set(r.id, r)
    return m
  })

  // Ordered fact ids: first ledger sections, then remaining from others
  const seen = new Set<string>()
  const ordered: Array<{ factId: string; sectionId: string; sectionTitle: string; fact: string }> =
    []

  for (const col of columns) {
    for (const sec of col.ledger.sections) {
      for (const id of sec.rowIds) {
        if (seen.has(id)) continue
        seen.add(id)
        const row = col.ledger.rows.find((r) => r.id === id)
        ordered.push({
          factId: id,
          sectionId: sec.id,
          sectionTitle: sec.title,
          fact: row?.fact || id,
        })
      }
    }
  }

  const rows: CompareHubMatrixRow[] = ordered.map((meta) => {
    const cells: CompareHubMatrixCell[] = byCol.map((m) => {
      const r = m.get(meta.factId)
      if (!r) {
        return { value: '—', empty: true }
      }
      return {
        value: r.value,
        source: r.source,
        sourceUrl: r.sourceUrl,
        detail: r.detail,
        empty: isDataHubValueEmpty(r.value),
      }
    })
    const sources = new Set(
      cells.filter((c) => !c.empty && c.source).map((c) => c.source as string),
    )
    // Prefer section title from first non-empty ledger that has the row
    let sectionId = meta.sectionId
    let sectionTitle = meta.sectionTitle
    for (let i = 0; i < columns.length; i++) {
      const r = byCol[i]!.get(meta.factId)
      if (r && !isDataHubValueEmpty(r.value)) {
        const st = sectionTitleFor(columns[i]!.ledger, meta.factId)
        sectionId = st.id
        sectionTitle = st.title
        break
      }
    }
    return {
      factId: meta.factId,
      fact: meta.fact,
      sectionId,
      sectionTitle,
      sourceHint: sources.size <= 1 ? Array.from(sources)[0] || '—' : 'multiple sources',
      cells,
    }
  })

  const filledFactCount = rows.filter((r) => r.cells.some((c) => !c.empty)).length

  return {
    columns: columns.map((c) => ({
      subjectId: c.subjectId,
      subjectLabel: c.subjectLabel,
      sourceCount: c.ledger.sourceCount,
    })),
    rows,
    filledFactCount,
    notes: [
      'Side-by-side public-record facts from free APIs loaded for each CID on this page.',
      'Empty cells mean not retrieved in this compare session — not proof of absence.',
      'Not for clinical or regulatory decision support. Open primary sources before wet-lab use.',
    ],
  }
}

/** TSV/CSV for notebook export of the matrix. */
export function compareHubMatrixToDelimited(
  matrix: CompareHubMatrix,
  format: 'csv' | 'tsv',
  opts?: { includeEmpty?: boolean },
): string {
  const delim = format === 'tsv' ? '\t' : ','
  const includeEmpty = opts?.includeEmpty === true
  const headers = [
    'section',
    'fact',
    'source_hint',
    ...matrix.columns.map((c) => `${c.subjectLabel} (${c.subjectId})`),
  ]
  const escape = (raw: string) => {
    if (!raw.includes(delim) && !raw.includes('"') && !raw.includes('\n')) return raw
    return `"${raw.replace(/"/g, '""')}"`
  }
  const lines = [headers.map(escape).join(delim)]
  for (const r of matrix.rows) {
    if (!includeEmpty && r.cells.every((c) => c.empty)) continue
    const cells = [
      r.sectionTitle,
      r.fact,
      r.sourceHint,
      ...r.cells.map((c) => c.value),
    ].map((x) => escape(String(x ?? '')))
    lines.push(cells.join(delim))
  }
  const body = lines.join('\n')
  return format === 'csv' ? `\uFEFF${body}` : body
}

export function compareHubMatrixFilename(
  matrix: CompareHubMatrix,
  format: 'csv' | 'tsv',
): string {
  const ids = matrix.columns
    .map((c) => c.subjectId)
    .join('-')
    .slice(0, 48)
  return `biointel-compare-data-hub-${ids || 'molecules'}.${format}`
}
