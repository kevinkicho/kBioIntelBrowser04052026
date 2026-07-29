/**
 * Hub section: Regulatory / product
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'

export function buildRegulatoryPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Regulatory / product ---
  const orange = asArr(data, 'orangeBookEntries')
  const ndc = asArr(data, 'ndcProducts')
  const drugsFda = asArr(data, 'drugsFdaApplications')
  const labels = asArr(data, 'drugLabels')
  const ema = asArr(data, 'emaMedicines')
  const hc = asArr(data, 'healthCanadaDpd')
  const firstOb = orange[0]
  const firstLabel = labels[0]
  const firstEma = ema[0]

  const regRows: DataHubRow[] = [
    row({
      id: 'reg-orange-count',
      fact: 'Orange Book entries',
      value: orange.length ? String(orange.length) : null,
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-orange-trade',
      fact: 'Orange Book trade name',
      value: str(firstOb?.tradeName) || str(firstOb?.activeIngredient),
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
      detail: str(firstOb?.applicationNumber) || undefined,
    }),
    row({
      id: 'reg-orange-approval',
      fact: 'Orange Book approval date',
      value: str(firstOb?.approvalDate),
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-ndc',
      fact: 'NDC products',
      value: ndc.length ? String(ndc.length) : null,
      source: 'openFDA NDC',
      panelId: 'ndc',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-drugsfda',
      fact: 'Drugs@FDA applications',
      value: drugsFda.length ? String(drugsFda.length) : null,
      source: 'openFDA Drugs@FDA',
      panelId: 'drugs-fda',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-dailymed',
      fact: 'DailyMed label',
      value: str(firstLabel?.title) || (labels.length ? `${labels.length} label(s)` : null),
      source: 'DailyMed / openFDA',
      sourceUrl: str(firstLabel?.dailyMedUrl) || str(firstLabel?.url) || undefined,
      panelId: 'dailymed',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-ema',
      fact: 'EMA medicine (sample)',
      value: str(firstEma?.name) || str(firstEma?.medicineName) || (ema.length ? String(ema.length) : null),
      source: 'EMA / Open Targets',
      panelId: 'ema-medicines',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-hc',
      fact: 'Health Canada DPD',
      value: hc.length ? String(hc.length) : null,
      source: 'Health Canada DPD',
      panelId: 'health-canada-dpd',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
  ]
  all.push(...regRows)
  sections.push(section('regulatory', 'Regulatory & product registers', 'regulatory', regRows))


  return { rows: all, sections }
}
