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
import { hashDataHubLedger } from './contentHash'
import { hubClaimsPackToJson, hubLedgerToPackClaimsHandoff } from './hubClaimsToPack'
import { scoreHubCitationCompleteness, scoreClaimCitationCompleteness } from './citationCompleteness'
import { buildSafetyTriangulation } from './safetyTriangulation'
import { buildFiveRegulatorCard } from './fiveRegulatorCard'
import { buildHubClaimGraph } from './hubClaimGraph'

export type ResearchKitDownloadMode = 'single' | 'multi'

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
  /**
   * Download mode: single JSON bundle (default, browser-friendly) or multi-file.
   */
  mode?: ResearchKitDownloadMode
  /**
   * Optional category bags for v3 safety triangulation / five-regulator scores
   * (same DTOs used to build the ledger; pure recompute).
   */
  sessionBags?: Record<string, unknown>
}

export interface ResearchKitManifest {
  /** v2 adds citation + triangulation extras; still reads as biointel-research-kit */
  schemaVersion: 1 | 2
  kind: 'biointel-research-kit'
  subjectId: string
  subjectLabel: string
  exportedAt: string
  files: string[]
  sourceCount: number
  factCount: number
  claimCount: number
  honesty: string[]
  /** Present when exported as a single-file bundle */
  bundle?: boolean
  /** v2: hub citation completeness 0–1 */
  citationScore?: number
  /** v2: safety triangulation score 0–1 */
  safetyTriangulationScore?: number
  /** v2: regulator regions with session evidence */
  fiveRegulatorRegions?: number
}

/** Single-file research kit for lab handoff (no multi-download). */
export interface ResearchKitBundle {
  schemaVersion: 1 | 2
  kind: 'biointel-research-kit-bundle'
  subjectId: string
  subjectLabel: string
  exportedAt: string
  /** Of-record ledger content hash for re-open / kit-diff */
  contentHash?: string
  manifest: ResearchKitManifest
  files: {
    'data-hub.csv': string
    'sources.json': string
    'claims.md'?: string
    'research-view-prefs.json'?: string
    'README.md': string
    'hub-claims-pack.json'?: string
    /** v3 interchange: JSON extras for campaigns / agents */
    'v3-quality.json'?: string
  }
  honesty: string[]
  /** Optional bags used to recompute triangulation (not of-record rank) */
  _sessionBags?: Record<string, unknown>
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
    '1. Prefer the single-file `*-bundle.json` download (default). Open it as JSON or extract embedded CSV fields.',
    '2. Open `data-hub.csv` (or the embedded field) in a spreadsheet for of-record public facts.',
    '3. Use `sources.json` for API docs links and per-source fact counts on this page session.',
    '4. Claims (if present) are extractor statements with provenance — cite primary registries for grants.',
    '5. Import `research-view-prefs.json` (or the full bundle) via the Research view “Import prefs” control — presentation pins only; does not change Discover ranks.',
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
  extras?: {
    citationScore?: number
    safetyTriangulationScore?: number
    fiveRegulatorRegions?: number
  },
): ResearchKitManifest {
  const filled = ledger.rows.filter((r) => r.value && r.value !== '—').length
  const hasV2 =
    extras?.citationScore != null ||
    extras?.safetyTriangulationScore != null ||
    extras?.fiveRegulatorRegions != null
  return {
    schemaVersion: hasV2 ? 2 : 1,
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
      ...(hasV2
        ? ['v2 kit includes citation + safety triangulation + five-regulator coverage scores']
        : []),
    ],
    citationScore: extras?.citationScore,
    safetyTriangulationScore: extras?.safetyTriangulationScore,
    fiveRegulatorRegions: extras?.fiveRegulatorRegions,
  }
}

/** v3 quality annex for agents and campaign handoff */
export function buildResearchKitV3QualityJson(
  ledger: DataHubLedger,
  claims: readonly EvidenceClaim[],
  sessionBags?: Record<string, unknown>,
): string {
  const hubCite = scoreHubCitationCompleteness(ledger)
  const claimCite = scoreClaimCitationCompleteness(claims)
  const bags = sessionBags || {}
  const safety = buildSafetyTriangulation(bags)
  const five = buildFiveRegulatorCard(bags)
  const graph = buildHubClaimGraph(ledger, { maxClaims: 40 })
  return JSON.stringify(
    {
      schemaVersion: 2,
      kind: 'biointel-research-kit-v3-quality',
      hubCitation: hubCite,
      claimCitation: claimCite,
      safetyTriangulation: {
        score: safety.triangulationScore,
        sourcesWithData: safety.sourcesWithData,
        sourcesQueried: safety.sourcesQueried,
        honesty: safety.honesty,
      },
      fiveRegulators: {
        regionsWithData: five.regionsWithData,
        regions: five.rows.map((r) => ({ region: r.region, status: r.status })),
        honesty: five.honesty,
      },
      claimGraph: {
        claimCount: graph.claims.length,
        edgeCount: graph.edges.length,
        byDomain: graph.byDomain,
      },
      productLaw: [
        'Of-record only from free public APIs',
        'Not clinical or regulatory decision support',
        'Discover rank remains deterministic outside this kit',
      ],
    },
    null,
    2,
  )
}

function resolveKitParts(input: ResearchKitInput): {
  base: string
  files: string[]
  hubCsv: string
  sourcesJson: string
  claimsMd: string | null
  prefsJson: string | null
  readme: string
  manifest: ResearchKitManifest
  claimList: EvidenceClaim[]
  prefsObj: ResearchViewPrefs | null
} {
  const { ledger, claims, notes, includeEmpty, includePrefs = true } = input
  const base = kitBase(ledger)
  const hubCsvName = `${base}-data-hub.csv`
  const sourcesName = `${base}-sources.json`
  const prefsName = `${base}-research-view-prefs.json`
  const readmeName = `${base}-README.md`
  const manifestName = `${base}-manifest.json`
  const claimsName = `${base}-claims.md`
  const bundleName = `${base}-bundle.json`

  const claimList = claims ? [...claims] : []
  const wantPrefs = includePrefs !== false
  const prefsObj =
    typeof includePrefs === 'object' && includePrefs
      ? includePrefs
      : wantPrefs
        ? loadResearchViewPrefs()
        : null

  const mode = input.mode ?? 'single'
  const files =
    mode === 'single'
      ? [bundleName]
      : (() => {
          const f = [hubCsvName, sourcesName]
          if (claimList.length > 0) f.push(claimsName)
          if (prefsObj) f.push(prefsName)
          f.push(readmeName, manifestName)
          return f
        })()

  const hubCsv = dataHubToDelimited(ledger, 'csv', { includeEmpty: !!includeEmpty })
  const sourcesJson = buildResearchKitSourcesJson(ledger)
  const claimsMd =
    claimList.length > 0
      ? buildResearchKitClaimsMarkdown(claimList, ledger.subjectLabel)
      : null
  const prefsJson = prefsObj
    ? JSON.stringify(researchViewPrefsExportPayload(prefsObj), null, 2)
    : null
  // README lists logical parts for single-file mode
  const logicalFiles =
    mode === 'single'
      ? [
          'data-hub.csv (inside bundle)',
          'sources.json (inside bundle)',
          ...(claimsMd ? ['claims.md (inside bundle)'] : []),
          ...(prefsJson ? ['research-view-prefs.json (inside bundle)'] : []),
          'README.md (inside bundle)',
          bundleName,
        ]
      : files
  const readme = buildResearchKitReadme(ledger, logicalFiles, notes)
  const manifest = buildResearchKitManifest(ledger, logicalFiles, claimList.length)
  if (mode === 'single') manifest.bundle = true

  return {
    base,
    files,
    hubCsv,
    sourcesJson,
    claimsMd,
    prefsJson,
    readme,
    manifest,
    claimList,
    prefsObj,
  }
}

/** Build a single-file research kit bundle (pure). */
export function buildResearchKitBundle(input: ResearchKitInput): ResearchKitBundle {
  const parts = resolveKitParts({ ...input, mode: 'single' })
  const contentHash = hashDataHubLedger(input.ledger)
  const handoff = hubLedgerToPackClaimsHandoff(input.ledger)
  const claimList = input.claims ?? []
  const hubCite = scoreHubCitationCompleteness(input.ledger)
  const claimCite = scoreClaimCitationCompleteness(claimList)
  const bags = input.sessionBags || {}
  const safety = buildSafetyTriangulation(bags)
  const five = buildFiveRegulatorCard(bags)
  const v3Quality = buildResearchKitV3QualityJson(input.ledger, claimList, bags)

  const files: ResearchKitBundle['files'] = {
    'data-hub.csv': parts.hubCsv,
    'sources.json': parts.sourcesJson,
    'README.md': parts.readme,
    'hub-claims-pack.json': hubClaimsPackToJson(handoff),
    'v3-quality.json': v3Quality,
  }
  if (parts.claimsMd) files['claims.md'] = parts.claimsMd
  if (parts.prefsJson) files['research-view-prefs.json'] = parts.prefsJson

  const manifest = buildResearchKitManifest(
    input.ledger,
    Object.keys(files),
    claimList.length,
    {
      citationScore: claimList.length > 0 ? claimCite.score : hubCite.score,
      safetyTriangulationScore: safety.triangulationScore,
      fiveRegulatorRegions: five.regionsWithData,
    },
  )

  return {
    schemaVersion: 2,
    kind: 'biointel-research-kit-bundle',
    subjectId: input.ledger.subjectId,
    subjectLabel: input.ledger.subjectLabel,
    exportedAt: new Date().toISOString(),
    contentHash,
    manifest: {
      ...manifest,
      honesty: [
        ...manifest.honesty,
        `Content hash: ${contentHash}`,
        'Includes hub-claims-pack.json + v3-quality.json (citation, safety triangulation, five-regulator)',
      ],
    },
    files,
    honesty: [
      ...manifest.honesty,
      `Content hash: ${contentHash}`,
    ],
  }
}

/**
 * Download research kit in the browser.
 * Default: single JSON bundle (reliable). Pass mode:'multi' for separate files.
 */
export async function downloadResearchKit(input: ResearchKitInput): Promise<ResearchKitManifest> {
  const mode = input.mode ?? 'single'
  const parts = resolveKitParts({ ...input, mode })

  if (mode === 'single') {
    const bundle = buildResearchKitBundle(input)
    downloadFile(
      JSON.stringify(bundle, null, 2),
      `${parts.base}-bundle.json`,
      'application/json;charset=utf-8',
    )
    return parts.manifest
  }

  // Multi-file (legacy / advanced)
  downloadFile(parts.hubCsv, `${parts.base}-data-hub.csv`, dataHubMime('csv'))
  await sleep(180)
  downloadFile(parts.sourcesJson, `${parts.base}-sources.json`, 'application/json;charset=utf-8')
  await sleep(180)
  if (parts.claimsMd) {
    downloadFile(parts.claimsMd, `${parts.base}-claims.md`, 'text/markdown;charset=utf-8')
    await sleep(180)
  }
  if (parts.prefsJson) {
    downloadFile(
      parts.prefsJson,
      `${parts.base}-research-view-prefs.json`,
      'application/json;charset=utf-8',
    )
    await sleep(180)
  }
  downloadFile(parts.readme, `${parts.base}-README.md`, 'text/markdown;charset=utf-8')
  await sleep(180)
  downloadFile(
    JSON.stringify(parts.manifest, null, 2),
    `${parts.base}-manifest.json`,
    'application/json;charset=utf-8',
  )

  return parts.manifest
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
