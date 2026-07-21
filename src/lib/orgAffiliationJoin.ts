/**
 * Pure affiliation joins: trial sponsors ↔ ROR orgs ↔ CMS hospitals ↔ colleges.
 * Deterministic token overlap — not clinical referral or “best site” ranking.
 */

import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'

export type AffiliationKind = 'sponsor-ror' | 'ror-hospital' | 'ror-college' | 'hospital-college'

export interface AffiliationEdge {
  id: string
  kind: AffiliationKind
  leftLabel: string
  rightLabel: string
  score: number
  leftHref?: string
  rightHref?: string
  detail?: string
}

export interface SponsorHint {
  name: string
  count?: number
}

const STOP = new Set([
  'the',
  'of',
  'and',
  'inc',
  'llc',
  'ltd',
  'corp',
  'corporation',
  'company',
  'co',
  'hospital',
  'medical',
  'center',
  'centre',
  'university',
  'college',
  'institute',
  'research',
  'health',
  'system',
  'group',
  'foundation',
])

export function normalizeAffiliationTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t))
}

/** Jaccard-ish token overlap in [0,1]. */
export function tokenOverlapScore(a: string, b: string): number {
  const ta = new Set(normalizeAffiliationTokens(a))
  const tb = new Set(normalizeAffiliationTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of Array.from(ta)) {
    if (tb.has(t)) inter += 1
  }
  if (inter === 0) return 0
  const union = ta.size + tb.size - inter
  const jaccard = inter / union
  // Boost substring containment for short brand sponsors
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  if (al.length >= 4 && bl.includes(al)) return Math.max(jaccard, 0.85)
  if (bl.length >= 4 && al.includes(bl)) return Math.max(jaccard, 0.85)
  return jaccard
}

function bestMatch<T extends { label: string; href?: string }>(
  left: string,
  rights: T[],
  minScore: number,
): { right: T; score: number } | null {
  let best: { right: T; score: number } | null = null
  for (const r of rights) {
    const score = tokenOverlapScore(left, r.label)
    if (score < minScore) continue
    if (!best || score > best.score) best = { right: r, score }
  }
  return best
}

/**
 * Join free directory rows into affiliation edges.
 */
export function buildOrgAffiliationJoins(input: {
  sponsors?: readonly SponsorHint[] | null
  rorOrgs?: readonly RorOrganization[] | null
  hospitals?: readonly CmsHospital[] | null
  colleges?: readonly UsCollege[] | null
  minScore?: number
  maxEdges?: number
}): { edges: AffiliationEdge[]; notes: string[] } {
  const minScore = input.minScore ?? 0.34
  const maxEdges = input.maxEdges ?? 40
  const edges: AffiliationEdge[] = []
  const notes: string[] = []

  const ror = (input.rorOrgs ?? []).map((o) => ({
    label: o.name,
    href: `https://ror.org/${o.rorId}`,
    id: o.rorId,
    detail: [o.city, o.countryName].filter(Boolean).join(', '),
  }))
  const hospitals = (input.hospitals ?? []).map((h) => ({
    label: h.facilityName,
    href: h.careCompareUrl,
    id: h.facilityId,
    detail: [h.city, h.state].filter(Boolean).join(', '),
  }))
  const colleges = (input.colleges ?? []).map((c) => ({
    label: c.name,
    href: c.scorecardUrl,
    id: c.id,
    detail: [c.city, c.state].filter(Boolean).join(', '),
  }))

  const sponsors = input.sponsors ?? []
  for (const s of sponsors) {
    const m = bestMatch(s.name, ror, minScore)
    if (!m) continue
    edges.push({
      id: `sponsor-ror:${s.name}|${m.right.id}`,
      kind: 'sponsor-ror',
      leftLabel: s.name,
      rightLabel: m.right.label,
      score: m.score,
      rightHref: m.right.href,
      detail: m.right.detail
        ? `ROR match${s.count ? ` · ${s.count} trial(s)` : ''} · ${m.right.detail}`
        : s.count
          ? `${s.count} trial(s)`
          : 'ROR name overlap',
    })
  }

  for (const o of ror) {
    const h = bestMatch(o.label, hospitals, minScore)
    if (h) {
      edges.push({
        id: `ror-hospital:${o.id}|${h.right.id}`,
        kind: 'ror-hospital',
        leftLabel: o.label,
        rightLabel: h.right.label,
        score: h.score,
        leftHref: o.href,
        rightHref: h.right.href,
        detail: 'ROR ↔ CMS hospital name overlap',
      })
    }
    const c = bestMatch(o.label, colleges, minScore + 0.05)
    if (c) {
      edges.push({
        id: `ror-college:${o.id}|${c.right.id}`,
        kind: 'ror-college',
        leftLabel: o.label,
        rightLabel: c.right.label,
        score: c.score,
        leftHref: o.href,
        rightHref: c.right.href,
        detail: 'ROR ↔ College Scorecard name overlap',
      })
    }
  }

  // Hospital ↔ college (same city campus-ish) is noisy; only high overlap
  for (const h of hospitals.slice(0, 20)) {
    const c = bestMatch(h.label, colleges, 0.5)
    if (!c) continue
    edges.push({
      id: `hospital-college:${h.id}|${c.right.id}`,
      kind: 'hospital-college',
      leftLabel: h.label,
      rightLabel: c.right.label,
      score: c.score,
      leftHref: h.href,
      rightHref: c.right.href,
      detail: 'Hospital ↔ college name overlap',
    })
  }

  edges.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  const out = edges.slice(0, maxEdges)

  if (out.length === 0) {
    notes.push(
      'No affiliation overlaps above threshold. Try a broader search (e.g. university name) or paste trial sponsors.',
    )
  } else {
    notes.push(
      'Joins are deterministic name-token overlaps on free public directories — not official affiliations or referral advice.',
    )
  }

  return { edges: out, notes }
}

/** Parse free-text sponsors (one per line or comma-separated). */
export function parseSponsorHints(text: string): SponsorHint[] {
  const parts = text
    .split(/[\n,;|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
  const seen = new Set<string>()
  const out: SponsorHint[] = []
  for (const name of parts) {
    const k = name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ name })
  }
  return out.slice(0, 40)
}
