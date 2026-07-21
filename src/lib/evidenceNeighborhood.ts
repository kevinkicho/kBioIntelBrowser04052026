/**
 * Pure join: evidence neighborhood — orgs × trials × grants × literature density.
 * Deterministic counts only; not LLM-ranked competitive intelligence.
 */

import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'

export interface NeighborhoodNode {
  id: string
  label: string
  kind: 'sponsor' | 'facility' | 'ror' | 'hospital' | 'college' | 'grant-org' | 'literature'
  detail?: string
  count?: number
  href?: string
}

export interface NeighborhoodEdge {
  from: string
  to: string
  label: string
}

export interface EvidenceNeighborhood {
  moleculeName: string
  nodes: NeighborhoodNode[]
  edges: NeighborhoodEdge[]
  stats: {
    trialCount: number
    uniqueSponsors: number
    uniqueFacilities: number
    rorOrgCount: number
    hospitalCount: number
    collegeCount: number
    grantInstituteCount: number
    literatureCount: number
    countryHints: string[]
  }
  notes: string[]
  /** Always true so profile panel visibility treats this as loaded */
  ready: true
}

function nid(kind: string, key: string): string {
  return `${kind}:${key.toLowerCase().slice(0, 80)}`
}

/**
 * Build neighborhood graph model from profile-category DTOs (partial OK).
 */
export function buildEvidenceNeighborhood(input: {
  moleculeName: string
  clinicalTrials?: readonly ClinicalTrial[] | null
  researchOrgs?: readonly RorOrganization[] | null
  researchOrgsLit?: readonly RorOrganization[] | null
  euResearchOrgs?: readonly RorOrganization[] | null
  usHospitals?: readonly CmsHospital[] | null
  usColleges?: readonly UsCollege[] | null
  nihGrants?: readonly { institute?: string; title?: string }[] | null
  literature?: readonly unknown[] | null
  pubmedArticles?: readonly unknown[] | null
  openAlexWorks?: readonly unknown[] | null
  purpleBookProducts?: readonly PurpleBookProduct[] | null
}): EvidenceNeighborhood {
  const moleculeName = input.moleculeName?.trim() || 'Molecule'
  const nodes: NeighborhoodNode[] = []
  const edges: NeighborhoodEdge[] = []
  const notes: string[] = []
  const nodeIds = new Set<string>()

  const addNode = (n: NeighborhoodNode) => {
    if (nodeIds.has(n.id)) return
    nodeIds.add(n.id)
    nodes.push(n)
  }

  const molId = nid('mol', moleculeName)
  addNode({ id: molId, label: moleculeName, kind: 'literature', detail: 'Subject molecule' })

  const trials = input.clinicalTrials ?? []
  const sponsors = new Map<string, number>()
  const facilities = new Map<string, number>()
  const countries = new Set<string>()

  for (const t of trials) {
    const sp = t.sponsor?.trim()
    if (sp && !/^unknown$/i.test(sp)) {
      sponsors.set(sp, (sponsors.get(sp) || 0) + 1)
    }
    for (const f of t.facilities ?? []) {
      if (f.name) facilities.set(f.name, (facilities.get(f.name) || 0) + 1)
      if (f.country) countries.add(f.country)
    }
  }

  for (const [name, count] of Array.from(sponsors.entries()).slice(0, 12)) {
    const id = nid('sponsor', name)
    addNode({
      id,
      label: name,
      kind: 'sponsor',
      count,
      detail: `${count} ClinicalTrials.gov listing(s) with this sponsor name`,
      // Official registry search (deep link) — not a homepage shell
      href: `https://clinicaltrials.gov/search?term=${encodeURIComponent(name)}&aggFilters=status:rec%20not%20yet%20rec%20act%20com`,
    })
    edges.push({ from: molId, to: id, label: 'trial sponsor' })
  }
  for (const [name, count] of Array.from(facilities.entries()).slice(0, 12)) {
    const id = nid('facility', name)
    addNode({
      id,
      label: name,
      kind: 'facility',
      count,
      detail: `${count} trial site listing(s) on ClinicalTrials.gov`,
      href: `https://clinicaltrials.gov/search?locn=${encodeURIComponent(name)}`,
    })
    edges.push({ from: molId, to: id, label: 'trial site' })
  }

  const rorAll = [
    ...(input.researchOrgs ?? []),
    ...(input.researchOrgsLit ?? []),
    ...(input.euResearchOrgs ?? []),
  ]
  const seenRor = new Set<string>()
  for (const o of rorAll) {
    if (seenRor.has(o.rorId)) continue
    seenRor.add(o.rorId)
    const id = nid('ror', o.rorId)
    addNode({
      id,
      label: o.name,
      kind: 'ror',
      detail: [o.city, o.countryCode, o.types.slice(0, 2).join('/')].filter(Boolean).join(' · '),
      href: `https://ror.org/${o.rorId}`,
    })
    edges.push({ from: molId, to: id, label: o.matchSource?.startsWith('eu') ? 'EU research org' : 'research org' })
    if (o.countryName) countries.add(o.countryName)
    if (nodes.filter((n) => n.kind === 'ror').length >= 16) break
  }

  for (const h of (input.usHospitals ?? []).slice(0, 10)) {
    const id = nid('hospital', h.facilityId || h.facilityName)
    addNode({
      id,
      label: h.facilityName,
      kind: 'hospital',
      detail: [h.city, h.state, h.hospitalType].filter(Boolean).join(' · '),
      href: h.careCompareUrl,
    })
    edges.push({ from: molId, to: id, label: 'US hospital (CMS)' })
  }

  for (const c of (input.usColleges ?? []).slice(0, 8)) {
    const id = nid('college', c.id)
    addNode({
      id,
      label: c.name,
      kind: 'college',
      detail: [c.city, c.state, c.source].filter(Boolean).join(' · '),
      href: c.scorecardUrl,
    })
    edges.push({ from: molId, to: id, label: 'US college' })
  }

  const grantInst = new Map<string, number>()
  for (const g of input.nihGrants ?? []) {
    const inst = g.institute?.trim()
    if (!inst || /^unknown$/i.test(inst)) continue
    grantInst.set(inst, (grantInst.get(inst) || 0) + 1)
  }
  for (const [name, count] of Array.from(grantInst.entries()).slice(0, 10)) {
    const id = nid('grant', name)
    addNode({
      id,
      label: name,
      kind: 'grant-org',
      count,
      detail: `${count} NIH RePORTER project(s) listing this institute`,
      href: `https://reporter.nih.gov/search/results?query=${encodeURIComponent(name)}`,
    })
    edges.push({ from: molId, to: id, label: 'NIH grant org' })
  }

  const litCount =
    (input.literature?.length ?? 0) +
    (input.pubmedArticles?.length ?? 0) +
    (input.openAlexWorks?.length ?? 0)
  if (litCount > 0) {
    const id = nid('lit', 'corpus')
    addNode({
      id,
      label: 'Literature corpus',
      kind: 'literature',
      count: litCount,
      detail: `${litCount} free-API rows (Europe PMC / PubMed / OpenAlex) for this molecule name`,
      href: `https://europepmc.org/search?query=${encodeURIComponent(moleculeName)}`,
    })
    edges.push({ from: molId, to: id, label: 'publications' })
  }

  if (trials.length === 0 && rorAll.length === 0 && grantInst.size === 0) {
    notes.push('Load Clinical & Safety and Research & Literature categories for a denser neighborhood.')
  }

  return {
    moleculeName,
    nodes,
    edges,
    stats: {
      trialCount: trials.length,
      uniqueSponsors: sponsors.size,
      uniqueFacilities: facilities.size,
      rorOrgCount: seenRor.size,
      hospitalCount: (input.usHospitals ?? []).length,
      collegeCount: (input.usColleges ?? []).length,
      grantInstituteCount: grantInst.size,
      literatureCount: litCount,
      countryHints: Array.from(countries).slice(0, 12),
    },
    notes,
    ready: true,
  }
}
