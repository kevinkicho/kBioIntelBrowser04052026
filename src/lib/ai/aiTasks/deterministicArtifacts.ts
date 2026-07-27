/**
 * Deterministic research artifacts — no LLM required when free-API bags allow.
 * Prefer these over fluent empty essays.
 */

import type { MoleculeContext } from '@/lib/ai/copilot/context/types'
import type { EvidenceGroundingStats } from '@/lib/ai/copilot/evidenceDensity'
import type { CategoryId } from '@/lib/categoryConfig'
import type { SuggestedEntity } from './suggestNext'

/** Boolean prior-art query from named targets/mechanisms/indications only. */
export function buildDeterministicPriorArtQuery(ctx: MoleculeContext): {
  query: string
  grounded: boolean
  notes: string[]
} {
  const name = ctx.identity.name.trim()
  const notes: string[] = []
  if (!name) {
    return { query: '', grounded: false, notes: ['No molecule name'] }
  }

  const synonyms = (ctx.identity.synonyms ?? [])
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== name.toLowerCase())
    .slice(0, 6)

  const quote = (s: string) => {
    if (/\s/.test(s) || /[-/]/.test(s)) return `"${s.replace(/"/g, '')}"`
    return s
  }

  const nameGroup = [name, ...synonyms].map(quote)
  const nameClause =
    nameGroup.length === 1 ? nameGroup[0]! : `(${nameGroup.join(' OR ')})`

  const targets = Array.from(
    new Set(
      ctx.rich.topTargetActivities
        .map((t) => t.targetName.trim())
        .filter(Boolean)
        .slice(0, 6),
    ),
  )
  const mechs = Array.from(
    new Set(
      ctx.rich.mechanismDetails
        .map((m) => m.mechanismOfAction.trim() || m.targetName.trim())
        .filter(Boolean)
        .slice(0, 4),
    ),
  )
  const bioTerms = Array.from(new Set([...targets, ...mechs])).slice(0, 8)
  const inds = Array.from(
    new Set(
      ctx.rich.indicationDetails
        .map((i) => i.condition.trim())
        .filter(Boolean)
        .slice(0, 4),
    ),
  )

  const parts: string[] = [nameClause]
  if (bioTerms.length) {
    parts.push(`(${bioTerms.map(quote).join(' OR ')})`)
    notes.push(`Grounded targets/MoA: ${bioTerms.join(', ')}`)
  } else {
    notes.push('No targets/MoA in bag — name-only query (thin)')
  }
  if (inds.length) {
    parts.push(`(${inds.map(quote).join(' OR ')})`)
    notes.push(`Indications: ${inds.join(', ')}`)
  }

  // Mild intent broadeners only when we have biology
  if (bioTerms.length) {
    parts.push('(inhibitor OR antagonist OR therapy OR treatment OR composition)')
  }

  const query = parts.join(' AND ')
  const grounded = Boolean(name) && (bioTerms.length > 0 || inds.length > 0 || synonyms.length > 0)
  return { query, grounded, notes }
}

/** Deterministic “what to open next” from gaps + loaded evidence. */
export function buildDeterministicNextActions(
  ctx: MoleculeContext,
  grounding: EvidenceGroundingStats,
  categoryStatus?: Partial<Record<CategoryId, string>>,
): {
  entities: SuggestedEntity[]
  actions: Array<{ action: string; why: string; categoryId?: CategoryId }>
} {
  const entities: SuggestedEntity[] = []
  const actions: Array<{ action: string; why: string; categoryId?: CategoryId }> = []

  for (const cat of grounding.missingCore) {
    actions.push({
      action: `Load category ${cat}`,
      why: 'Core free-API bag for synthesis and safety/target grounding',
      categoryId: cat,
    })
  }

  if (ctx.clinical.totalTrials === 0 && categoryStatus?.['clinical-safety'] !== 'loaded') {
    actions.push({
      action: 'Load clinical-safety',
      why: 'No trial rows yet — needed for clinical stage grounding',
      categoryId: 'clinical-safety',
    })
  }
  if (
    ctx.biological.bioactivityCount === 0 &&
    categoryStatus?.['bioactivity-targets'] !== 'loaded'
  ) {
    actions.push({
      action: 'Load bioactivity-targets',
      why: 'No ChEMBL activities — MoA/target synthesis blocked',
      categoryId: 'bioactivity-targets',
    })
  }
  if (
    ctx.research.publicationCount === 0 &&
    categoryStatus?.['research-literature'] !== 'loaded'
  ) {
    actions.push({
      action: 'Load research-literature',
      why: 'No literature/grant samples for prior art or landscape',
      categoryId: 'research-literature',
    })
  }

  // Entity suggestions from actual bag names only
  for (const t of ctx.rich.topTargetActivities.slice(0, 3)) {
    const sym = t.targetName.trim()
    if (!sym) continue
    // Prefer gene-like tokens
    const geneLike = sym.split(/[\s(]/)[0] || sym
    entities.push({
      type: 'gene',
      name: geneLike,
      reason: `Target activity on ${ctx.identity.name} (pChEMBL/assay in bag)`,
    })
  }
  for (const d of ctx.rich.diseaseAssociations.slice(0, 2)) {
    if (!d.diseaseName) continue
    entities.push({
      type: 'disease',
      name: d.diseaseName,
      reason: `Disease association score ${d.score} in loaded free-API rows`,
    })
  }
  for (const i of ctx.rich.indicationDetails.slice(0, 2)) {
    if (!i.condition) continue
    if (entities.some((e) => e.name.toLowerCase() === i.condition.toLowerCase())) continue
    entities.push({
      type: 'disease',
      name: i.condition,
      reason: `Listed indication (max phase ${i.maxPhase === -1 ? '?' : i.maxPhase})`,
    })
  }

  // Cap
  const uniqEntities: SuggestedEntity[] = []
  const seen = new Set<string>()
  for (const e of entities) {
    const k = `${e.type}:${e.name.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    uniqEntities.push(e)
    if (uniqEntities.length >= 5) break
  }

  // Pad with pathway-derived only if still short
  if (uniqEntities.length < 3) {
    for (const p of ctx.rich.pathwayNames.slice(0, 3)) {
      if (uniqEntities.length >= 5) break
      const k = `disease:${p.name.toLowerCase()}`
      if (seen.has(k)) continue
      seen.add(k)
      uniqEntities.push({
        type: 'disease',
        name: p.name,
        reason: `Pathway hit [${p.source}] — explore related biology`,
      })
    }
  }

  return { entities: uniqEntities, actions: actions.slice(0, 8) }
}

export interface SafetyMemoRow {
  reaction: string
  reports: number
  serious: number
  moaLink: 'possible-on-target' | 'unexplained' | 'off-target-suspect'
  note: string
}

export interface SafetyMemoArtifact {
  kind: 'safety_memo'
  title: string
  honesty: string[]
  mechanisms: string[]
  rows: SafetyMemoRow[]
  unexplained: string[]
  recalls: string[]
  boxedWarning: boolean
  overallRisk: string
  summaryLines: string[]
}

/** Deterministic safety memo table — mechanism-linked vs unexplained AEs. */
export function buildDeterministicSafetyMemo(ctx: MoleculeContext): SafetyMemoArtifact {
  const moaText = ctx.rich.mechanismDetails
    .map((m) => `${m.mechanismOfAction} ${m.targetName} ${m.actionType}`.toLowerCase())
    .join(' ')
  const targetTokens = new Set(
    ctx.rich.topTargetActivities
      .flatMap((t) => t.targetName.toLowerCase().split(/[^a-z0-9]+/))
      .filter((t) => t.length > 3),
  )
  for (const m of ctx.rich.mechanismDetails) {
    for (const part of m.targetName.toLowerCase().split(/[^a-z0-9]+/)) {
      if (part.length > 3) targetTokens.add(part)
    }
  }

  // Heuristic keyword map for common on-target AE themes (not clinical claims)
  const themeHints: Array<{ re: RegExp; tokens: string[]; label: string }> = [
    { re: /nause|vomit|gastr|ulcer|gi |gastro|bleed|hemorrh/i, tokens: ['cox', 'ptgs', 'cyclooxygenase', 'prostaglandin'], label: 'GI / COX-related theme' },
    { re: /hepat|liver|transaminase|jaundice/i, tokens: ['cyp', 'liver', 'p450'], label: 'Hepatic theme' },
    { re: /qt |arrhythm|cardio|myocard|heart/i, tokens: ['herg', 'kcnh', 'channel', 'cardiac'], label: 'Cardiac theme' },
    { re: /rash|derm|skin|prurit/i, tokens: ['kinase', 'egfr', 'immune'], label: 'Derm / immuno theme' },
    { re: /infect/i, tokens: ['immuno', 'jak', 'il-', 'tnf'], label: 'Infection / immuno theme' },
  ]

  const rows: SafetyMemoRow[] = []
  const unexplained: string[] = []

  for (const ae of ctx.rich.topAdverseEvents.slice(0, 15)) {
    const name = ae.reactionName
    let moaLink: SafetyMemoRow['moaLink'] = 'unexplained'
    let note = 'No clear token overlap with loaded MoA/targets — treat as unexplained signal'
    const lower = name.toLowerCase()

    for (const hint of themeHints) {
      if (!hint.re.test(name)) continue
      const hit = hint.tokens.some((t) => moaText.includes(t) || targetTokens.has(t))
      if (hit) {
        moaLink = 'possible-on-target'
        note = `${hint.label}: weak lexical link to loaded MoA/targets (hypothesis only)`
        break
      }
      moaLink = 'off-target-suspect'
      note = `${hint.label}: AE present but MoA bag lacks matching tokens`
    }

    // Direct token overlap AE name vs target
    for (const tok of Array.from(targetTokens)) {
      if (tok.length > 4 && lower.includes(tok)) {
        moaLink = 'possible-on-target'
        note = `AE string overlaps target token "${tok}" (weak)`
        break
      }
    }

    rows.push({
      reaction: name,
      reports: ae.count,
      serious: ae.serious,
      moaLink,
      note,
    })
    if (moaLink === 'unexplained') unexplained.push(name)
  }

  const mechanisms = ctx.rich.mechanismDetails
    .slice(0, 8)
    .map((m) => `${m.mechanismOfAction} → ${m.targetName} (${m.actionType})`)

  const recalls = ctx.rich.recallDetails
    .slice(0, 6)
    .map((r) => `[${r.classification}] ${r.reason.slice(0, 120)} (${r.recallingFirm})`)

  const summaryLines = [
    `${ctx.identity.name}: ${rows.length} top AE rows from session FAERS-style bag; ${unexplained.length} unexplained by loaded MoA tokens.`,
    mechanisms.length
      ? `MoA in bag: ${mechanisms.slice(0, 3).join('; ')}`
      : 'No mechanism rows loaded — cannot link AEs to on-target pharmacology.',
    `Risk heuristic=${ctx.safety.overallRisk}; boxed warning flag=${ctx.safety.hasBoxedWarning ? 'yes' : 'no'}; recalls=${recalls.length}.`,
    'FAERS counts are reports not incidence. Not clinical decision support. Verify in openFDA / labels.',
  ]

  return {
    kind: 'safety_memo',
    title: `Safety memo — ${ctx.identity.name}`,
    honesty: [
      'Free public API session samples only',
      'Report counts ≠ incidence or causality',
      'Lexical MoA–AE links are hypotheses, not proven',
      'Not regulatory decision support',
    ],
    mechanisms,
    rows,
    unexplained,
    recalls,
    boxedWarning: ctx.safety.hasBoxedWarning,
    overallRisk: ctx.safety.overallRisk,
    summaryLines,
  }
}

export function formatSafetyMemoAsText(memo: SafetyMemoArtifact): string {
  const lines: string[] = []
  lines.push(memo.title)
  lines.push(memo.honesty.map((h) => `• ${h}`).join('\n'))
  lines.push('')
  lines.push('Mechanisms:')
  if (!memo.mechanisms.length) lines.push('  (none loaded)')
  else memo.mechanisms.forEach((m) => lines.push(`  - ${m}`))
  lines.push('')
  lines.push('AE table (reaction | reports | serious | link | note):')
  for (const r of memo.rows) {
    lines.push(
      `  - ${r.reaction} | ${r.reports} | ${r.serious} | ${r.moaLink} | ${r.note}`,
    )
  }
  if (memo.recalls.length) {
    lines.push('')
    lines.push('Recalls:')
    memo.recalls.forEach((r) => lines.push(`  - ${r}`))
  }
  lines.push('')
  memo.summaryLines.forEach((s) => lines.push(s))
  return lines.join('\n')
}
