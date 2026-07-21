/**
 * Research-lab dossier pipeline — free public APIs only.
 * Server-side fetch aggregator for /api/research-labs.
 */

import { searchRorOrganizations } from '@/lib/api/ror'
import { searchEuResearchOrgsPack } from '@/lib/api/euResearchOrgs'
import { searchUsCollegesByName } from '@/lib/api/collegeScorecard'
import { searchCmsHospitalsByName } from '@/lib/api/cmsHospitals'
import { searchOpenAlexInstitutions } from '@/lib/api/openAlexInstitutions'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import {
  getEuResearchProjectsByName,
  getOpenAirePublicationsByName,
} from '@/lib/api/openaire'
import { buildResearchLabDossier } from './buildDossier'
import type { ResearchLabDossier, ResearchLabGrantHint, ResearchLabOpenAireHint } from './types'

export interface ResearchLabPipelineInput {
  query: string
  countryCode?: string
  includeEuPack?: boolean
  includeGrants?: boolean
  includeOpenAire?: boolean
  includeHospitals?: boolean
}

export interface ResearchLabPipelineResult {
  ok: boolean
  dossier: ResearchLabDossier
  warnings: string[]
}

/**
 * Parallel free-API harvest → pure dossier assemble.
 */
export async function runResearchLabPipeline(
  input: ResearchLabPipelineInput,
): Promise<ResearchLabPipelineResult> {
  const q = input.query.trim()
  const warnings: string[] = []
  if (q.length < 2) {
    return {
      ok: false,
      dossier: buildResearchLabDossier({ query: q }),
      warnings: ['Query must be at least 2 characters'],
    }
  }

  const includeGrants = input.includeGrants !== false
  const includeOpenAire = input.includeOpenAire !== false
  const includeHospitals = input.includeHospitals !== false

  const [
    ror,
    euRor,
    colleges,
    hospitals,
    openAlex,
    grantsRaw,
    openAireProjects,
    openAirePubs,
  ] = await Promise.all([
    searchRorOrganizations(q, {
      countryCode: input.countryCode,
    }).catch(() => {
      warnings.push('ROR search failed')
      return []
    }),
    input.includeEuPack
      ? searchEuResearchOrgsPack(q, { totalCap: 16, perCountry: 2 }).catch(() => {
          warnings.push('EU ROR pack failed')
          return []
        })
      : Promise.resolve([]),
    // Skip IPEDS enrich on interactive pipeline — saves sequential outbound calls
    searchUsCollegesByName(q, 12, { enrichIpeds: false }).catch(() => {
      warnings.push('College Scorecard failed')
      return []
    }),
    includeHospitals
      ? searchCmsHospitalsByName(q, 12).catch(() => {
          warnings.push('CMS hospitals failed')
          return []
        })
      : Promise.resolve([]),
    // Single untyped OpenAlex search (3 type-split calls was 3× latency for typeahead-like UX)
    searchOpenAlexInstitutions(q, {
      limit: 18,
      countryCode: input.countryCode,
    }).catch(() => {
      warnings.push('OpenAlex institutions failed')
      return []
    }),
    includeGrants
      ? getNihGrantsByName(q).catch(() => {
          warnings.push('NIH RePORTER failed')
          return []
        })
      : Promise.resolve([]),
    includeOpenAire
      ? getEuResearchProjectsByName(q).catch(() => {
          warnings.push('OpenAIRE projects failed')
          return []
        })
      : Promise.resolve([]),
    includeOpenAire
      ? getOpenAirePublicationsByName(q).catch(() => {
          warnings.push('OpenAIRE publications failed')
          return []
        })
      : Promise.resolve([]),
  ])

  // Dedupe ROR
  const seenRor = new Set<string>()
  const rorOrgs = []
  for (const o of [...ror, ...euRor]) {
    if (seenRor.has(o.rorId)) continue
    seenRor.add(o.rorId)
    rorOrgs.push(o)
  }

  const grants: ResearchLabGrantHint[] = (grantsRaw as Array<{
    projectNumber?: string
    title?: string
    institute?: string
    piName?: string
    fundingAmount?: number
    startDate?: string
    endDate?: string
  }>).map((g) => ({
    projectNumber: g.projectNumber || '',
    title: g.title || '',
    institute: g.institute || '',
    piName: g.piName || '',
    fundingAmount: g.fundingAmount || 0,
    startDate: g.startDate || '',
    endDate: g.endDate || '',
  }))

  const openAire: ResearchLabOpenAireHint[] = [
    ...(openAireProjects as Array<{ id?: string; title?: string; url?: string }>).map((p) => ({
      id: p.id || p.title || 'project',
      title: p.title || 'OpenAIRE project',
      kind: 'project' as const,
      href: p.url,
    })),
    ...(openAirePubs as Array<{ id?: string; title?: string; url?: string }>).map((p) => ({
      id: p.id || p.title || 'pub',
      title: p.title || 'OpenAIRE publication',
      kind: 'publication' as const,
      href: p.url,
    })),
  ]

  const dossier = buildResearchLabDossier({
    query: q,
    rorOrgs,
    openAlexInstitutions: openAlex,
    colleges,
    hospitals,
    grants,
    openAire,
  })

  return {
    ok:
      dossier.stats.rorCount +
        dossier.stats.openAlexCount +
        dossier.stats.collegeCount +
        dossier.stats.grantCount >
      0,
    dossier,
    warnings,
  }
}
