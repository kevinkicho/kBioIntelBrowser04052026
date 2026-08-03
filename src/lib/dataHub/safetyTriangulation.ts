/**
 * Safety triangulation (v3 A5) — of-record multi-source safety sample summary.
 * Pure; no network. FAERS/recalls/labels/SIDER/CompTox only — never incidence rates.
 */

import { row, section, asArr, str } from './moleculeHubShared'
import type { DataHubRow, DataHubSection } from './types'

export interface SafetyTriangulationSource {
  id: string
  label: string
  present: boolean
  sampleCount: number
  note: string
}

export interface SafetyTriangulation {
  sources: SafetyTriangulationSource[]
  sourcesWithData: number
  sourcesQueried: number
  triangulationScore: number
  honesty: string[]
}

/**
 * Summarize how many free public safety-ish sources contributed sample rows.
 * Score is coverage of loaded sources (0–1), not clinical risk.
 */
export function buildSafetyTriangulation(data: Record<string, unknown>): SafetyTriangulation {
  const aes = asArr(data, 'adverseEvents')
  const recalls = asArr(data, 'drugRecalls')
  const labels = asArr(data, 'drugLabels')
  const sider = asArr(data, 'siderSideEffects')
  const comptox = data.compToxData
  const hazards = data.hazards
  const shortages = asArr(data, 'drugShortages')

  const hasKey = (k: string) => Object.prototype.hasOwnProperty.call(data, k)

  const sources: SafetyTriangulationSource[] = [
    {
      id: 'faers',
      label: 'openFDA FAERS',
      present: aes.length > 0,
      sampleCount: aes.length,
      note: 'Spontaneous reports — not incidence',
    },
    {
      id: 'recalls',
      label: 'openFDA Enforcement',
      present: recalls.length > 0,
      sampleCount: recalls.length,
      note: 'Enforcement actions in sample',
    },
    {
      id: 'labels',
      label: 'DailyMed / openFDA labels',
      present: labels.length > 0,
      sampleCount: labels.length,
      note: 'Label documents only',
    },
    {
      id: 'sider',
      label: 'SIDER-compatible (FAERS-derived)',
      present: sider.length > 0,
      sampleCount: sider.length,
      note: 'Frequency strings approximate',
    },
    {
      id: 'comptox',
      label: 'EPA CompTox',
      present: comptox != null && typeof comptox === 'object',
      sampleCount: comptox != null ? 1 : 0,
      note: 'Chemical hazard context',
    },
    {
      id: 'hazards',
      label: 'PubChem GHS hazards',
      present: hazards != null && (Array.isArray(hazards) ? hazards.length > 0 : true),
      sampleCount: Array.isArray(hazards) ? hazards.length : hazards != null ? 1 : 0,
      note: 'GHS classification when present',
    },
    {
      id: 'shortages',
      label: 'FDA Drug Shortages',
      present: shortages.length > 0,
      sampleCount: shortages.length,
      note: 'Supply disruption sample',
    },
  ]

  // Only count sources that were at least attempted (key present) or have data
  const considered = sources.filter((s) => {
    if (s.present) return true
    if (s.id === 'faers') return hasKey('adverseEvents')
    if (s.id === 'recalls') return hasKey('drugRecalls')
    if (s.id === 'labels') return hasKey('drugLabels')
    if (s.id === 'sider') return hasKey('siderSideEffects')
    if (s.id === 'comptox') return hasKey('compToxData')
    if (s.id === 'hazards') return hasKey('hazards')
    if (s.id === 'shortages') return hasKey('drugShortages')
    return false
  })

  const sourcesWithData = considered.filter((s) => s.present).length
  const sourcesQueried = Math.max(considered.length, 1)
  const triangulationScore = Math.round((sourcesWithData / sourcesQueried) * 100) / 100

  return {
    sources,
    sourcesWithData,
    sourcesQueried,
    triangulationScore,
    honesty: [
      'Safety triangulation is of-record coverage of free public samples — not a risk score.',
      'FAERS and spontaneous reports are not incidence rates or causality.',
      'Not clinical or regulatory decision support. Verify in primary labels and literature.',
    ],
  }
}

/** Hub rows + section for safety triangulation. */
export function buildSafetyTriangulationPart(
  data: Record<string, unknown>,
): { rows: DataHubRow[]; section: DataHubSection | null } {
  const tri = buildSafetyTriangulation(data)
  if (tri.sourcesQueried === 0 && tri.sourcesWithData === 0) {
    return { rows: [], section: null }
  }

  const rows: DataHubRow[] = [
    row({
      id: 'sf-tri-score',
      fact: 'Safety source triangulation (session)',
      value: `${tri.sourcesWithData}/${tri.sourcesQueried} sources with sample data (score ${tri.triangulationScore})`,
      source: 'BioIntel of-record assemble',
      domain: 'safety',
      categoryId: 'clinical-safety',
      detail: tri.honesty[0],
    }),
    ...tri.sources
      .filter((s) => s.present || s.sampleCount > 0)
      .slice(0, 8)
      .map((s) =>
        row({
          id: `sf-tri-${s.id}`,
          fact: `Safety sample · ${s.label}`,
          value: s.present ? `${s.sampleCount} row(s)` : 'empty sample',
          source: s.label,
          domain: 'safety',
          categoryId: 'clinical-safety',
          detail: s.note,
        }),
      ),
  ]

  // Top FAERS reaction echo for triangulation context
  const aes = asArr(data, 'adverseEvents')
  const top = [...aes].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0]
  if (top) {
    rows.push(
      row({
        id: 'sf-tri-top-ae',
        fact: 'Top FAERS reaction in triangulation sample',
        value: str(top.reactionName) || str(top.reaction),
        source: 'openFDA FAERS',
        panelId: 'adverse-events',
        categoryId: 'clinical-safety',
        domain: 'safety',
        detail: 'Not incidence — sample tally only',
      }),
    )
  }

  return {
    rows,
    section: section(
      'safety-triangulation',
      'Safety triangulation (free public samples)',
      'safety',
      rows,
    ),
  }
}
