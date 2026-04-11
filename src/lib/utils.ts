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
