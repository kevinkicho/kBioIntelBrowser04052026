/**
 * Hub section: Safety
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

export function buildSafetyPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Safety ---
  const aes = asArr(data, 'adverseEvents')
  const recalls = asArr(data, 'drugRecalls')
  const shortages = asArr(data, 'drugShortages')
  const sider = asArr(data, 'siderSideEffects')
  const topAe = [...aes].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0]
  const firstRecall = recalls[0]

  const safetyRows: DataHubRow[] = [
    row({
      id: 'sf-faers-n',
      fact: 'FAERS reaction rows',
      value: aes.length ? String(aes.length) : null,
      source: 'openFDA FAERS',
      panelId: 'adverse-events',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: 'Spontaneous reports — not incidence rates',
    }),
    row({
      id: 'sf-faers-top',
      fact: 'Top FAERS reaction (sample)',
      value: str(topAe?.reactionName) || str(topAe?.reaction),
      source: 'openFDA FAERS',
      panelId: 'adverse-events',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: topAe?.count != null ? `n=${topAe.count} in loaded sample` : undefined,
    }),
    row({
      id: 'sf-recalls',
      fact: 'Enforcement recalls',
      value: recalls.length ? String(recalls.length) : null,
      source: 'openFDA Enforcement',
      panelId: 'recalls',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
    row({
      id: 'sf-recall-reason',
      fact: 'Sample recall reason',
      value: firstRecall ? str(firstRecall.reason)?.slice(0, 100) : null,
      source: 'openFDA Enforcement',
      panelId: 'recalls',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: str(firstRecall?.classification) || undefined,
    }),
    row({
      id: 'sf-shortages',
      fact: 'Drug shortage rows',
      value: shortages.length ? String(shortages.length) : null,
      source: 'FDA Drug Shortages',
      panelId: 'drug-shortages',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
    row({
      id: 'sf-sider',
      fact: 'SIDER-compatible SE rows',
      value: sider.length ? String(sider.length) : null,
      source: 'openFDA (SIDER-compatible)',
      panelId: 'sider',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
  ]
  all.push(...safetyRows)
  sections.push(section('safety', 'Safety signals (public)', 'safety', safetyRows))


  return { rows: all, sections }
}
