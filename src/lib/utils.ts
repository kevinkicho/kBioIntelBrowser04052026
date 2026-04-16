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

const API_TIMEOUTS: Record<string, number> = {
  'molecular-chemical': 20000,
  'bioactivity-targets': 20000,
  'genomics-disease': 20000,
  'interactions-pathways': 15000,
  'protein-structure': 15000,
  'clinical-safety': 15000,
  'pharmaceutical': 15000,
  'research-literature': 15000,
  'nih-high-impact': 15000,
}

export const API_SOURCE_TIMEOUTS: Record<string, number> = {
  lincs: 30000,
  massbank: 25000,
  chembl: 25000,
  'chembl-mechanisms': 25000,
  opentargets: 30000,
}

const DEFAULT_API_TIMEOUT = 15000

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