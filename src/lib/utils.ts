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
  return promise.catch(() => fallback)
}

const API_TIMEOUTS: Record<string, number> = {
  'molecular-chemical': 15000,
  'bioactivity-targets': 12000,
  'genomics-disease': 15000,
  'interactions-pathways': 12000,
  'protein-structure': 12000,
  'clinical-safety': 10000,
  'pharmaceutical': 10000,
  'research-literature': 10000,
  'nih-high-impact': 10000,
}

const DEFAULT_API_TIMEOUT = 10000

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

export function getCategoryTimeout(categoryId: string): number {
  return API_TIMEOUTS[categoryId] ?? DEFAULT_API_TIMEOUT
}
