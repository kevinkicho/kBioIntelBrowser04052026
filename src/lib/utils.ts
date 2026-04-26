import type { MoleculeClassification } from './types'

const THERAPEUTIC_KEYWORDS = [
  'drug', 'pharmaceutical', 'hormone', 'antibiotic', 'antiviral', 'vaccine',
  'peptide', 'protein therapeutic', 'monoclonal antibody', 'insulin',
  'therapeutic', 'medicine', 'treatment',
]

const ENZYME_KEYWORDS = [
  'enzyme', 'ase', 'kinase', 'protease', 'lipase', 'amylase', 'oxidase',
  'reductase', 'synthase', 'transferase', 'hydrolase', 'lyase', 'isomerase',
  'ligase',
]

const REAGENT_KEYWORDS = [
  'reagent', 'buffer', 'solvent', 'indicator', 'stain', 'laboratory',
  'analytical', 'standard', 'substrate',
]

const INDUSTRIAL_KEYWORDS = [
  'industrial', 'biofuel', 'bioplastic', 'fermentation product',
  'food additive', 'flavor', 'fragrance', 'agricultural',
]

export function classifyMolecule(
  name: string,
  synonymsOrCategories: string[]
): MoleculeClassification {
  const combined = [name, ...synonymsOrCategories].map(s => s.toLowerCase()).join(' ')

  if (ENZYME_KEYWORDS.some(k => combined.includes(k))) return 'enzyme'
  if (THERAPEUTIC_KEYWORDS.some(k => combined.includes(k))) return 'therapeutic'
  if (INDUSTRIAL_KEYWORDS.some(k => combined.includes(k))) return 'industrial'
  if (REAGENT_KEYWORDS.some(k => combined.includes(k))) return 'reagent'

  return 'unknown'
}

export function formatMolecularWeight(weight: number): string {
  return `${weight.toFixed(2)} g/mol`
}

export function buildStructureImageUrl(cid: number): string {
  return `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`
}

export function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return withTimeout(promise, DEFAULT_API_TIMEOUT).catch(() => fallback)
}

// Timeout strategy:
//   Each category fetcher fans out to 5-15 public APIs in parallel via Promise.all.
//   The slowest API in the group determines first-paint latency for that panel group.
//   Free public APIs that take >8s to respond are degraded — the user is better
//   served by an empty panel quickly than a 15s+ wait for a single laggy source.
//
//   - DEFAULT_API_TIMEOUT (8s) covers most healthy free APIs (typical p99 <3s).
//   - API_SOURCE_TIMEOUTS_BASE: hardcoded overrides for sources known to be slow.
//   - data/timeout-overrides.json: optional auto-tuned overrides (run
//     `npm run tune-timeouts` after collecting telemetry); merged on top of
//     the base map by API_SOURCE_TIMEOUTS getter below. Loader clamps to
//     [5000, 15000] ms so a runaway tuning run can't blow the budget.
//   - API_TIMEOUTS caps the whole category response at 12s so a stuck Promise.all
//     can't hold the route open longer than the slowest per-source override.

import { loadTunedTimeouts } from './analytics/timeouts'

const DEFAULT_API_TIMEOUT = 8000

const API_TIMEOUTS: Record<string, number> = {
  'molecular-chemical': 12000,
  'bioactivity-targets': 12000,
  'genomics-disease': 12000,
  'interactions-pathways': 12000,
  'protein-structure': 12000,
  'clinical-safety': 12000,
  'pharmaceutical': 12000,
  'research-literature': 12000,
  'nih-high-impact': 12000,
  'gene': 12000,
}

const API_SOURCE_TIMEOUTS_BASE: Record<string, number> = {
  // Known-slow sources from prior tuning — kept just above DEFAULT_API_TIMEOUT.
  lincs: 12000,
  massbank: 12000,
  chembl: 12000,
  'chembl-mechanisms': 12000,
  opentargets: 12000,
}

export const API_SOURCE_TIMEOUTS: Record<string, number> = new Proxy({}, {
  get(_, source: string) {
    const tuned = loadTunedTimeouts()
    return tuned[source] ?? API_SOURCE_TIMEOUTS_BASE[source]
  },
}) as Record<string, number>

export function withTimeout<T>(promise: Promise<T>, ms?: number): Promise<T> {
  const timeout = ms ?? DEFAULT_API_TIMEOUT
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`API call timed out after ${timeout}ms`)), timeout)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|tr|td|th)\b[^>]*>/gi, '\n')
    .replace(/<i\b[^>]*>([^<]*)<\/i>/gi, '$1')
    .replace(/<b\b[^>]*>([^<]*)<\/b>/gi, '$1')
    .replace(/<em\b[^>]*>([^<]*)<\/em>/gi, '$1')
    .replace(/<strong\b[^>]*>([^<]*)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export function getCategoryTimeout(categoryId: string): number {
  return API_TIMEOUTS[categoryId] ?? DEFAULT_API_TIMEOUT
}