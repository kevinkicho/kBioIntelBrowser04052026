/**
 * Five-regulator of-record card (v3 C1).
 * US · EU · CA · UK/AU/JP portal-context — free public only; no decision support.
 */

import { row, section, asArr, str } from './moleculeHubShared'
import type { DataHubRow, DataHubSection } from './types'

export type RegulatorRegion = 'US' | 'EU' | 'CA' | 'UK' | 'AU' | 'JP'

export interface RegulatorCardRow {
  region: RegulatorRegion
  register: string
  status: 'present' | 'empty' | 'portal' | 'not-in-session'
  summary: string
  sourceUrl?: string
  note: string
}

export interface FiveRegulatorCard {
  rows: RegulatorCardRow[]
  regionsWithData: number
  honesty: string[]
}

/**
 * Build five-regulator coverage from bags already on the profile.
 * UK/AU/JP remain portal-first when only deep-link payloads exist.
 */
export function buildFiveRegulatorCard(data: Record<string, unknown>): FiveRegulatorCard {
  const orange = asArr(data, 'orangeBookEntries')
  const ndc = asArr(data, 'ndcProducts')
  const drugsFda = asArr(data, 'drugsFdaApplications')
  const labels = asArr(data, 'drugLabels')
  const ema = asArr(data, 'emaMedicines')
  const emaBulk = asArr(data, 'emaBulkProducts')
  const hc = asArr(data, 'healthCanadaDpd')
  const intl = asArr(data, 'internationalRegulatorLinks')
  const purple = asArr(data, 'purpleBookProducts')
  const biologics = asArr(data, 'biologicsLicensed')

  const has = (k: string) => Object.prototype.hasOwnProperty.call(data, k)

  const usPresent =
    orange.length + ndc.length + drugsFda.length + labels.length + purple.length + biologics.length > 0
  const euPresent = ema.length + emaBulk.length > 0
  const caPresent = hc.length > 0

  const portalLinks = intl.filter((x) => {
    const region = String(x.region || x.country || x.agency || '').toUpperCase()
    return /UK|MHRA|AU|TGA|JP|PMDA|GB/.test(region) || Boolean(x.url || x.sourceUrl)
  })

  const rows: RegulatorCardRow[] = [
    {
      region: 'US',
      register: 'FDA openFDA / Orange Book / NDC / labels / Purple Book (when present)',
      status: usPresent ? 'present' : has('orangeBookEntries') || has('ndcProducts') || has('drugLabels') ? 'empty' : 'not-in-session',
      summary: usPresent
        ? `samples: OB=${orange.length} NDC=${ndc.length} Drugs@FDA=${drugsFda.length} labels=${labels.length}`
        : 'No US register rows in this session sample',
      note: 'Public register fields only — not approval advice',
    },
    {
      region: 'EU',
      register: 'EMA / Open Targets medicine samples + EMA bulk (when present)',
      status: euPresent ? 'present' : has('emaMedicines') || has('emaBulkProducts') ? 'empty' : 'not-in-session',
      summary: euPresent
        ? `EMA samples=${ema.length || emaBulk.length}`
        : 'No EMA sample rows in this session',
      sourceUrl: str(ema[0]?.url) || str(ema[0]?.eparUrl) || undefined,
      note: 'Not EU marketing authorization advice',
    },
    {
      region: 'CA',
      register: 'Health Canada DPD',
      status: caPresent ? 'present' : has('healthCanadaDpd') ? 'empty' : 'not-in-session',
      summary: caPresent ? `${hc.length} DPD row(s)` : 'No Health Canada rows in this session',
      note: 'DIN/status when retrieved — not clinical advice',
    },
    {
      region: 'UK',
      register: 'MHRA products / Yellow Card (portal)',
      status: portalLinks.some((x) => /UK|MHRA|GB/i.test(String(x.region || x.agency || x.label || '')))
        ? 'portal'
        : has('internationalRegulatorLinks')
          ? 'empty'
          : 'not-in-session',
      summary: 'Portal deep links when international-regulators panel loaded',
      note: 'Tier C portal — prefer official MHRA pages',
    },
    {
      region: 'AU',
      register: 'TGA ARTG (portal)',
      status: portalLinks.some((x) => /AU|TGA/i.test(String(x.region || x.agency || x.label || '')))
        ? 'portal'
        : has('internationalRegulatorLinks')
          ? 'empty'
          : 'not-in-session',
      summary: 'Portal deep links when available',
      note: 'Tier C portal',
    },
    {
      region: 'JP',
      register: 'PMDA English hub (portal)',
      status: portalLinks.some((x) => /JP|PMDA/i.test(String(x.region || x.agency || x.label || '')))
        ? 'portal'
        : has('internationalRegulatorLinks')
          ? 'empty'
          : 'not-in-session',
      summary: 'Portal deep links when available',
      note: 'Tier C portal',
    },
  ]

  const regionsWithData = rows.filter((r) => r.status === 'present' || r.status === 'portal').length

  return {
    rows,
    regionsWithData,
    honesty: [
      'Five-regulator card is of-record coverage of free public registers and portals — not multi-region authorization advice.',
      'Empty/not-in-session means not retrieved this session, not “unauthorized worldwide.”',
      'Not clinical or regulatory decision support.',
    ],
  }
}

export function buildFiveRegulatorPart(
  data: Record<string, unknown>,
): { rows: DataHubRow[]; section: DataHubSection | null } {
  const card = buildFiveRegulatorCard(data)
  const rows: DataHubRow[] = [
    row({
      id: 'reg-five-count',
      fact: 'Regulator regions with session evidence',
      value: `${card.regionsWithData} of ${card.rows.length} (US/EU/CA + portal UK/AU/JP)`,
      source: 'BioIntel of-record assemble',
      domain: 'regulatory',
      categoryId: 'pharmaceutical',
      detail: card.honesty[0],
    }),
    ...card.rows.map((r) =>
      row({
        id: `reg-five-${r.region.toLowerCase()}`,
        fact: `${r.region} · ${r.register.slice(0, 60)}`,
        value: `${r.status}: ${r.summary}`.slice(0, 200),
        source: r.register.split('/')[0]?.trim() || r.region,
        sourceUrl: r.sourceUrl,
        domain: 'regulatory',
        categoryId: 'pharmaceutical',
        detail: r.note,
      }),
    ),
  ]

  return {
    rows,
    section: section(
      'five-regulators',
      'Five-regulator coverage (free public / portal)',
      'regulatory',
      rows,
    ),
  }
}
