/**
 * Biologics / biosimilars Research kit chapter (v3 B2).
 * Panel enrichment only — not a biologics-first Discover identity model.
 * Pure; no network.
 */

import { asArr, str } from './moleculeHubShared'

export interface BiologicsKitChapter {
  schemaVersion: 1
  kind: 'biointel-biologics-chapter'
  present: boolean
  summary: {
    blaRows: number
    purpleBookRows: number
    purpleBookPatentRows: number
    emaBiosimilarHints: number
    sabdabRows: number
  }
  samples: Array<{ label: string; value: string; source: string }>
  honesty: string[]
}

/**
 * Build biologics enrichment chapter from profile bags when present.
 */
export function buildBiologicsKitChapter(data: Record<string, unknown>): BiologicsKitChapter {
  const bla = asArr(data, 'biologicsLicensed')
  const purple = asArr(data, 'purpleBookProducts')
  const purplePat = asArr(data, 'purpleBookPatents')
  const sabdab = asArr(data, 'sabdabStructures')
  const ema = asArr(data, 'emaMedicines')
  const emaBiosimilarHints = ema.filter((e) => {
    const t = String(e.drugType || e.type || e.medicineType || e.category || '').toLowerCase()
    return /antibod|protein|biosimilar|biologic|mab/.test(t)
  }).length

  const samples: BiologicsKitChapter['samples'] = []
  if (bla[0]) {
    samples.push({
      label: 'BLA application (sample)',
      value: str(bla[0].applicationNumber) || str(bla[0].sponsorName) || 'present',
      source: 'openFDA Drugs@FDA BLA',
    })
  }
  if (purple[0]) {
    samples.push({
      label: 'Purple Book product (sample)',
      value: str(purple[0].properName) || str(purple[0].proprietaryName) || 'present',
      source: 'FDA Purple Book',
    })
  }
  if (purplePat[0]) {
    samples.push({
      label: 'Purple Book patent (sample)',
      value: str(purplePat[0].patentNumber) || 'present',
      source: 'FDA Purple Book BPPT',
    })
  }
  if (sabdab[0]) {
    samples.push({
      label: 'SAbDab structure (sample)',
      value: str(sabdab[0].pdb) || str(sabdab[0].id) || 'present',
      source: 'SAbDab',
    })
  }

  const present =
    bla.length + purple.length + purplePat.length + sabdab.length + emaBiosimilarHints > 0

  return {
    schemaVersion: 1,
    kind: 'biointel-biologics-chapter',
    present,
    summary: {
      blaRows: bla.length,
      purpleBookRows: purple.length,
      purpleBookPatentRows: purplePat.length,
      emaBiosimilarHints,
      sabdabRows: sabdab.length,
    },
    samples,
    honesty: [
      'Biologics enrichment from free public registers — not a biologics-first Discover identity graph.',
      'CMC recipes / manufacturing process are not free public product APIs — do not invent.',
      'Not clinical or regulatory decision support. Interchangeability is portal/Purple Book ministerial data only.',
    ],
  }
}
