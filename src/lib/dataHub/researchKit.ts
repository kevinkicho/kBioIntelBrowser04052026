/**
 * Research kit export — multi-file download for lab notebooks.
 * Data hub CSV + source directory JSON + optional claims + README.
 * No zip dependency: sequential browser downloads.
 */

import type { EvidenceClaim } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  loadResearchViewPrefs,
  researchViewPrefsExportPayload,
  type ResearchViewPrefs,
} from '@/lib/researchViewPrefs'
import {
  buildSourceDirectory,
  type SourceDirectory,
} from './buildSourceDirectory'
import {
  dataHubExportFilename,
  dataHubMime,
  dataHubToDelimited,
} from './exportDataHub'
import type { DataHubLedger } from './types'

export interface ResearchKitInput {
  ledger: DataHubLedger
  /** Optional claim-bound statements (from extractors / pack) */
  claims?: readonly EvidenceClaim[] | null
  /** Extra notes for the kit README */
  notes?: string[]
  /** Include empty hub rows in CSV */
  includeEmpty?: boolean
  /**
   * Include research-view prefs JSON for lab handoff (default true).
   * Pass false to skip; pass an object to use explicit prefs instead of localStorage.
   */
  includePrefs?: boolean | ResearchViewPrefs
}

export interface ResearchKitManifest {
  schemaVersion: 1
  kind: 'biointel-research-kit'
  subjectId: string
  subjectLabel: string
  exportedAt: string
  files: string[]
  sourceCount: number
  factCount: number
  claimCount: number
  honesty: string[]
}

function slug(s: string): string {
  return (s || 'entity')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function kitBase(ledger: DataHubLedger): string {
  const id = ledger.subjectId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 20)
  return `biointel-research-kit-${slug(ledger.subjectLabel)}-${id || 'id'}`
}

export function buildResearchKitSourcesJson(ledger: DataHubLedger): string {
  const dir: SourceDirectory = buildSourceDirectory(ledger)
  return JSON.stringify(
    {
      subjectId: dir.subjectId,
      subjectLabel: dir.subjectLabel,
      withData: dir.withData,
      empty: dir.empty,
      total: dir.total,
      entries: dir.entries,
    },
    null,
    2,
  )
}

export function buildResearchKitClaimsMarkdown(
  claims: readonly EvidenceClaim[],
  subjectLabel: string,
): string {
  const lines = [
    `# Claims — ${subjectLabel}`,
    '',
    'Claim-bound statements extracted from free public API panels. Each claim keeps provenance.',
    'Not model-generated free text. Not for clinical or regulatory decision support.',
    '',
  ]
  if (claims.length === 0) {
    lines.push('_No claims available on this page yet (load Core panels or build a board pack)._')
    return lines.join('\n')
  }
  for (const c of claims) {
    const src = c.provenance?.source || 'unknown'
    const url = c.provenance?.sourceUrl
    const at = c.provenance?.retrievedAt
    lines.push(`## ${c.claimType || 'claim'}`)
    lines.push('')
    lines.push(c.statement || String(c.id || ''))
    lines.push('')
    lines.push(`- **Source:** ${src}`)
    if (url) lines.push(`- **URL:** ${url}`)
    if (at) lines.push(`- **Retrieved:** ${at}`)
    if (c.subjectCandidateId) lines.push(`- **Subject:** ${c.subjectCandidateId}`)
    lines.push('')
  }
  return lines.join('\n')
}

export function buildResearchKitReadme(
  ledger: DataHubLedger,
  files: string[],
  extraNotes?: string[],
): string {
  return [
    `# BioIntel research kit — ${ledger.subjectLabel}`,
    '',
    `Subject id: \`${ledger.subjectId}\``,
    `Exported: ${new Date().toISOString()}`,
    '',
    '## Contents',
    '',
    ...files.map((f) => `- \`${f}\``),
    '',
    '## How to use',
    '',
    '1. Open the CSV in a spreadsheet or notebook for of-record public facts.',
    '2. Use `sources.json` for API docs links and per-source fact counts on this page session.',
    '3. Claims (if present) are extractor statements with provenance — cite primary registries for grants.',
    '4. If present, `research-view-prefs.json` is a solo-local presentation pin snapshot (domains / hide-empty / default view). Import is manual; it does not change Discover ranks.',
    '',
    '## Honesty',
    '',
    '- Free public APIs only; values are session samples, not complete universe counts.',
    '- Not for clinical or regulatory decision support.',
    '- Verify deep links in primary sources before wet-lab or grant use.',
    ...(extraNotes || []).map((n) => `- ${n}`),
    ...(ledger.notes || []).map((n) => `- ${n}`),
    '',
  ].join('\n')
}

export function buildResearchKitManifest(
  ledger: DataHubLedger,
  files: string[],
  claimCount: number,
): ResearchKitManifest {
  const filled = ledger.rows.filter((r) => r.value && r.value !== '—').length
  return {
    schemaVersion: 1,
    kind: 'biointel-research-kit',
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    exportedAt: new Date().toISOString(),
    files,
    sourceCount: ledger.sourceCount,
    factCount: filled,
    claimCount,
    honesty: [
      'Free public APIs only',
      'Session samples not universe counts',
      'Not clinical or regulatory decision support',
    ],
  }
}

/**
 * Trigger multi-file research kit download in the browser.
 * Includes research-view prefs JSON by default for lab handoff.
 */
export async function downloadResearchKit(input: ResearchKitInput): Promise<ResearchKitManifest> {
  const { ledger, claims, notes, includeEmpty, includePrefs = true } = input
  const base = kitBase(ledger)
  const hubCsvName = `${base}-data-hub.csv`
  const sourcesName = `${base}-sources.json`
  const prefsName = `${base}-research-view-prefs.json`
  const readmeName = `${base}-README.md`
  const manifestName = `${base}-manifest.json`
  const claimsName = `${base}-claims.md`

  const claimList = claims ? [...claims] : []
  const wantPrefs = includePrefs !== false
  const prefsObj =
    typeof includePrefs === 'object' && includePrefs
      ? includePrefs
      : wantPrefs
        ? loadResearchViewPrefs()
        : null

  const files = [hubCsvName, sourcesName]
  if (claimList.length > 0) files.push(claimsName)
  if (prefsObj) files.push(prefsName)
  files.push(readmeName, manifestName)

  const hubCsv = dataHubToDelimited(ledger, 'csv', { includeEmpty: !!includeEmpty })
  const sourcesJson = buildResearchKitSourcesJson(ledger)
  const claimsMd =
    claimList.length > 0
      ? buildResearchKitClaimsMarkdown(claimList, ledger.subjectLabel)
      : null
  const prefsJson = prefsObj
    ? JSON.stringify(researchViewPrefsExportPayload(prefsObj), null, 2)
    : null
  const readme = buildResearchKitReadme(ledger, files, notes)
  const manifest = buildResearchKitManifest(ledger, files, claimList.length)

  // Stagger downloads so browsers do not coalesce them
  downloadFile(hubCsv, hubCsvName, dataHubMime('csv'))
  await sleep(180)
  downloadFile(sourcesJson, sourcesName, 'application/json;charset=utf-8')
  await sleep(180)
  if (claimsMd) {
    downloadFile(claimsMd, claimsName, 'text/markdown;charset=utf-8')
    await sleep(180)
  }
  if (prefsJson) {
    downloadFile(prefsJson, prefsName, 'application/json;charset=utf-8')
    await sleep(180)
  }
  downloadFile(readme, readmeName, 'text/markdown;charset=utf-8')
  await sleep(180)
  downloadFile(
    JSON.stringify(manifest, null, 2),
    manifestName,
    'application/json;charset=utf-8',
  )

  return manifest
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Filename helper used by UI labels */
export function researchKitBaseName(ledger: DataHubLedger): string {
  return kitBase(ledger)
}

// Re-export for tests that expect hub filename style
export { dataHubExportFilename }
