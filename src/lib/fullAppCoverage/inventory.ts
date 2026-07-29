/**
 * Full-app surface inventory — single source for coverage gates.
 * Product law: free public APIs; Discover of-record rank deterministic; AI non-of-record.
 */

import fs from 'fs'
import path from 'path'
import {
  CATEGORIES,
  MOLECULE_CATEGORY_IDS,
  type CategoryId,
  type PanelDef,
} from '@/lib/categoryConfig'
import { getPanelSource } from '@/lib/panelSources'
import { getPanelTier } from '@/lib/panelTiers'
import { isPanelSourceDisabled } from '@/lib/api/sourceAvailability'
import { PROMPT_CATALOG } from '@/lib/methods/systemWiringCatalog'
import { AI_PROVENANCE_HONESTY } from '@/lib/ai/aiProvenance'

export interface InventoryPanel {
  categoryId: CategoryId
  categoryLabel: string
  panel: PanelDef
  tier: ReturnType<typeof getPanelTier>
  hasPanelSource: boolean
  sourceApi?: string
  sourceDocs?: string
  disabled: boolean
  /** Resolved component path under src/components/profile if found */
  componentPath: string | null
  componentExportHint: string | null
}

export interface InventoryRoute {
  id: string
  path: string
  pageFile: string
  role: 'product' | 'diagnostics' | 'docs' | 'embed'
}

/** App pages users hit (relative to src/app). */
export const APP_ROUTES: InventoryRoute[] = [
  { id: 'home', path: '/', pageFile: 'src/app/page.tsx', role: 'product' },
  { id: 'discover', path: '/discover', pageFile: 'src/app/discover/page.tsx', role: 'product' },
  { id: 'molecule', path: '/molecule/[id]', pageFile: 'src/app/molecule/[id]/page.tsx', role: 'product' },
  { id: 'gene', path: '/gene/[id]', pageFile: 'src/app/gene/[id]/page.tsx', role: 'product' },
  { id: 'disease', path: '/disease', pageFile: 'src/app/disease/page.tsx', role: 'product' },
  { id: 'disease-detail', path: '/disease/[id]', pageFile: 'src/app/disease/[id]/page.tsx', role: 'product' },
  { id: 'compare', path: '/compare', pageFile: 'src/app/compare/page.tsx', role: 'product' },
  { id: 'cohort', path: '/cohort', pageFile: 'src/app/cohort/page.tsx', role: 'product' },
  { id: 'hypothesis', path: '/hypothesis', pageFile: 'src/app/hypothesis/page.tsx', role: 'product' },
  { id: 'projects', path: '/projects', pageFile: 'src/app/projects/page.tsx', role: 'product' },
  { id: 'pack', path: '/pack/[id]', pageFile: 'src/app/pack/[id]/page.tsx', role: 'product' },
  { id: 'watchlist', path: '/watchlist', pageFile: 'src/app/watchlist/page.tsx', role: 'product' },
  { id: 'batch', path: '/batch', pageFile: 'src/app/batch/page.tsx', role: 'product' },
  { id: 'interactions', path: '/interactions', pageFile: 'src/app/interactions/page.tsx', role: 'product' },
  { id: 'orgs', path: '/orgs', pageFile: 'src/app/orgs/page.tsx', role: 'product' },
  { id: 'browse', path: '/browse', pageFile: 'src/app/browse/page.tsx', role: 'product' },
  { id: 'analytics', path: '/analytics', pageFile: 'src/app/analytics/page.tsx', role: 'diagnostics' },
  { id: 'methodology', path: '/methodology', pageFile: 'src/app/methodology/page.tsx', role: 'docs' },
  { id: 'how-it-works', path: '/how-it-works', pageFile: 'src/app/how-it-works/page.tsx', role: 'docs' },
  { id: 'ai-history', path: '/ai-history', pageFile: 'src/app/ai-history/page.tsx', role: 'product' },
  { id: 'embed-molecule', path: '/embed/molecule/[id]', pageFile: 'src/app/embed/molecule/[id]/page.tsx', role: 'embed' },
]

/** Stable data-testid / chrome contracts used across the product shell. */
export const CHROME_TEST_IDS = [
  'molecule-data-hub',
  'data-hub-ledger',
  'ai-copilot-fab',
  'molecule-cross-source',
  'cross-source-strip',
  'source-directory',
  'api-provenance-chip',
  'ai-content-provenance',
  'request-metrics-panel',
  'structure-3d-toggle',
] as const

/** Substrings that must appear in source for diagnostics surfaces. */
export const DIAGNOSTICS_SURFACES = [
  {
    id: 'runtime-config-api',
    file: 'src/app/api/runtime-config/route.ts',
    mustContain: ['firebaseClient', 'ollamaCloud', 'ok: true'],
  },
  {
    id: 'request-metrics-panel',
    file: 'src/components/analytics/RequestMetricsPanel.tsx',
    mustContain: ['snapshotRequestMetrics', 'clearRequestMetrics'],
  },
  {
    id: 'source-status-strip',
    file: 'src/app/discover/components/SourceStatusStrip.tsx',
    mustContain: ['countSourceStatuses', 'bucketForStatus'],
  },
  {
    id: 'source-availability',
    file: 'src/lib/api/sourceAvailability.ts',
    mustContain: ['isPanelSourceDisabled', 'DISABLED_API_SOURCES'],
  },
  {
    id: 'panel-api-trace',
    file: 'src/lib/panelApiTrace.ts',
    mustContain: ['filterTraceForPanel', 'loadStatusFromPanelTrace'],
  },
  {
    id: 'api-tracker',
    file: 'src/lib/api-tracker.ts',
    mustContain: ['metricsToSourceStatus'],
  },
  {
    id: 'agent-activity-log',
    file: 'src/lib/agentActivityLog.ts',
    mustContain: ['agent-activity'],
  },
] as const

/** AI surfaces that must stay non-of-record / claim-bound. */
export const AI_SURFACES = [
  {
    id: 'ai-content-provenance',
    file: 'src/components/ai/AiContentProvenance.tsx',
    mustContain: ['non-of-record', 'data-testid'],
  },
  {
    id: 'ai-panel-intro',
    file: 'src/components/ai/AiPanelIntro.tsx',
    mustContain: ['data-testid'],
  },
  {
    id: 'ai-provenance-contract',
    file: 'src/lib/ai/aiProvenance.ts',
    mustContain: ['AI_PROVENANCE_HONESTY', 'non-of-record'],
  },
  {
    id: 'pack-ai-panel',
    file: 'src/components/evidence/PackAiPanel.tsx',
    mustContain: ['AiContentProvenance', 'pack-ai-content-provenance'],
  },
  {
    id: 'ai-copilot',
    file: 'src/components/ai/AICopilot.tsx',
    mustContain: ['ai-copilot-fab', 'AiContentProvenance'],
  },
] as const

export const PRODUCT_LAW_MARKERS = {
  freeApis: /Free public APIs only/i,
  noLlmRank: /no LLM in the (of-record )?rank path/i,
  evidenceFirst: /Evidence-first/i,
} as const

const PROFILE_DIR = 'src/components/profile'

/** Convert panel title / id into candidate component basenames. */
export function panelComponentCandidates(panel: PanelDef): string[] {
  const title = panel.title
  const id = panel.id
  const idPascal = id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  const candidates = new Set<string>([
    `${title}Panel`,
    `${title}`,
    `${idPascal}Panel`,
    `${idPascal}`,
    // Common renames
    title === 'NDC' ? 'NdcPanel' : '',
    title === 'OrangeBook' ? 'OrangeBookPanel' : '',
    title === 'HealthCanadaDPD' ? 'HealthCanadaDpdPanel' : '',
    title === 'EmaMedicines' ? 'EmaMedicinesPanel' : '',
    title === 'OpenFdaLabels' ? 'OpenFdaLabelSectionsPanel' : '',
    title === 'BiologicsLicensed' ? 'BiologicsLicensedPanel' : '',
    title === 'BiosimilarFamily' ? 'BiosimilarFamilyNavigator' : '',
    title === 'PurpleBook' ? 'PurpleBookPanel' : '',
    title === 'PurpleBookPatents' ? 'PurpleBookPatentsPanel' : '',
    title === 'Gene & Protein (UniProt)' || id === 'uniprot' ? 'UniprotPanel' : '',
    id === 'uniprot-extended' ? 'UniProtExtendedPanel' : '',
    id === 'sec' ? 'SecEdgarPanel' : '',
    id === 'open-alex' ? 'OpenAlexPanel' : '',
    id === 'open-citations' ? 'OpenCitationsPanel' : '',
    id === 'go' ? 'GeneOntologyPanel' : '',
    id === 'literature' ? 'LiteraturePanel' : '',
    id === 'research-orgs' || id === 'research-orgs-lit' ? 'ResearchOrgsPanel' : '',
    id === 'ctd-diseases' ? 'CTDPanel' : '',
    id === 'ebi-proteomics' ? 'EbiProteinsPanel' : '',
    id === 'ebi-crossrefs' ? 'EbiCrossRefsPanel' : '',
    id === 'gene-overview' || id === 'gene_drugs' ? 'GeneInfoPanel' : '',
    id === 'evidence-neighborhood' ? 'EvidenceNeighborhoodMap' : '',
  ].filter(Boolean))
  return Array.from(candidates)
}

export function resolvePanelComponent(
  panel: PanelDef,
  repoRoot: string = process.cwd(),
): { path: string | null; exportHint: string | null } {
  const dir = path.join(repoRoot, PROFILE_DIR)
  if (!fs.existsSync(dir)) return { path: null, exportHint: null }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  const lowerFiles = new Map(files.map((f) => [f.toLowerCase(), f]))

  for (const base of panelComponentCandidates(panel)) {
    const withExt = `${base}.tsx`
    const hit = lowerFiles.get(withExt.toLowerCase())
    if (hit) {
      return {
        path: path.join(PROFILE_DIR, hit).replace(/\\/g, '/'),
        exportHint: base.endsWith('Panel') || base.endsWith('Navigator') ? base : `${base}`,
      }
    }
  }

  // Fuzzy: file contains panel id tokens
  const tokens = panel.id.split(/[-_]/).filter((t) => t.length > 2)
  for (const f of files) {
    const fl = f.toLowerCase()
    if (tokens.every((t) => fl.includes(t.toLowerCase())) && fl.includes('panel')) {
      return {
        path: path.join(PROFILE_DIR, f).replace(/\\/g, '/'),
        exportHint: f.replace(/\.tsx?$/, ''),
      }
    }
  }
  return { path: null, exportHint: null }
}

export function listInventoryPanels(repoRoot: string = process.cwd()): InventoryPanel[] {
  const out: InventoryPanel[] = []
  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      const src = getPanelSource(panel.id)
      const resolved = resolvePanelComponent(panel, repoRoot)
      out.push({
        categoryId: cat.id,
        categoryLabel: cat.label,
        panel,
        tier: getPanelTier(panel.id),
        hasPanelSource: Boolean(src),
        sourceApi: src?.api,
        sourceDocs: src?.docs,
        disabled: isPanelSourceDisabled(panel.id),
        componentPath: resolved.path,
        componentExportHint: resolved.exportHint,
      })
    }
  }
  return out
}

export function inventorySummary(repoRoot: string = process.cwd()) {
  const panels = listInventoryPanels(repoRoot)
  const moleculePanels = panels.filter((p) =>
    (MOLECULE_CATEGORY_IDS as string[]).includes(p.categoryId),
  )
  const missingComponent = panels.filter((p) => !p.componentPath)
  const missingSource = panels.filter((p) => !p.hasPanelSource)
  return {
    totalPanels: panels.length,
    moleculePanels: moleculePanels.length,
    missingComponent,
    missingSource,
    aiPromptModes: PROMPT_CATALOG.length,
    aiHonestyLines: AI_PROVENANCE_HONESTY.length,
    routes: APP_ROUTES.length,
    chromeTestIds: CHROME_TEST_IDS.length,
    diagnostics: DIAGNOSTICS_SURFACES.length,
    aiSurfaces: AI_SURFACES.length,
    panels,
  }
}

export function readRepoFile(rel: string, repoRoot: string = process.cwd()): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8')
}

export function fileExists(rel: string, repoRoot: string = process.cwd()): boolean {
  return fs.existsSync(path.join(repoRoot, rel))
}
