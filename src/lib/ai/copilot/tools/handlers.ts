/**
 * Copilot tool executors by concern (retrieval / category / session / pack-board).
 * Called from executeCopilotTool — keep allowlist-only; no Discover rank tools.
 */

import type { CategoryId } from '@/lib/categoryConfig'
import { CATEGORIES, MOLECULE_CATEGORY_IDS } from '@/lib/categoryConfig'
import {
  formatRetrievalSummary,
  humanPanelTitle,
} from '@/lib/ai/copilot/retrieval'
import { sessionHistory } from '@/lib/sessionHistory'
import { getProject } from '@/lib/project/store'
import {
  saveResearchHypothesis,
  seedResearchHypothesisFromPack,
} from '@/lib/project/researchHypothesis'
import type { CopilotToolName } from './catalog'
import { isCategoryId, resolveProjectId, sampleArray } from './helpers'
import type { CopilotToolContext, ToolResult } from './types'

type Args = Record<string, unknown>

function ok(
  name: CopilotToolName,
  summary: string,
  extra: Partial<ToolResult> = {},
): ToolResult {
  return { name, ok: true, summary, ...extra }
}

function fail(name: CopilotToolName, summary: string): ToolResult {
  return { name, ok: false, summary }
}

// ── Retrieval ──────────────────────────────────────────────────────────────

export function toolGetRetrievalSnapshot(
  name: CopilotToolName,
  ctx: CopilotToolContext,
): ToolResult {
  const s = ctx.snapshot
  return ok(name, formatRetrievalSummary(s), {
    data: {
      overallCompleteness: s.overallCompleteness,
      categoryLoadRatio: s.categoryLoadRatio,
      withData: s.totalApisSucceeded,
      empty: s.totalApisEmpty,
      timeout: s.totalApisTimeout,
      error: s.totalApisErrored,
      pending: s.totalApisPending,
      gaps: s.gaps.slice(0, 25).map((g) => ({
        title: g.title,
        categoryId: g.categoryId,
        reason: g.reason,
        actionable: g.actionable,
        detail: g.detail,
        panelId: g.panelId,
        panelKey: g.panelKey,
      })),
    },
  })
}

export function toolListLoadedCategories(
  name: CopilotToolName,
  ctx: CopilotToolContext,
): ToolResult {
  const rows = MOLECULE_CATEGORY_IDS.map((id) => ({
    categoryId: id,
    label: CATEGORIES.find((c) => c.id === id)?.label || id,
    status: ctx.categoryStatus[id] || 'idle',
    completeness: ctx.snapshot.categories[id]?.completeness ?? 0,
    success: ctx.snapshot.categories[id]?.successPanels ?? 0,
    empty: ctx.snapshot.categories[id]?.emptyPanels ?? 0,
    failed:
      (ctx.snapshot.categories[id]?.errorPanels ?? 0) +
      (ctx.snapshot.categories[id]?.timeoutPanels ?? 0),
  }))
  return ok(
    name,
    rows
      .map(
        (r) =>
          `${r.label}: ${r.status} (data ${r.success}, empty ${r.empty}, fail ${r.failed})`,
      )
      .join('\n'),
    { data: rows },
  )
}

export function toolGetPanelSummary(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const raw = String(args.panelKey || args.panel || '').trim()
  if (!raw) return fail(name, 'Missing panelKey argument')
  let found: { cat: CategoryId; key: string; val: unknown } | null = null
  for (const catId of MOLECULE_CATEGORY_IDS) {
    const data = ctx.categoryData[catId]
    if (!data) continue
    if (raw in data) {
      found = { cat: catId, key: raw, val: data[raw] }
      break
    }
    const cat = CATEGORIES.find((c) => c.id === catId)
    const panel = cat?.panels.find((p) => p.id === raw || p.propKey === raw)
    if (panel && panel.propKey in data) {
      found = { cat: catId, key: panel.propKey, val: data[panel.propKey] }
      break
    }
  }
  if (!found) {
    return fail(
      name,
      `Panel "${raw}" not found in loaded category data. Load the parent category first.`,
    )
  }
  const count = Array.isArray(found.val)
    ? found.val.length
    : found.val == null
      ? 0
      : 1
  const samples = sampleArray(found.val, 5)
  const title = humanPanelTitle(found.key)
  return ok(
    name,
    `${title} (${found.key}) in ${found.cat}: ${count} item(s). Sample: ${JSON.stringify(samples).slice(0, 1200)}`,
    { data: { categoryId: found.cat, panelKey: found.key, title, count, samples } },
  )
}

// ── Category / panel UI ────────────────────────────────────────────────────

export function toolRetryCategory(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const id = String(args.categoryId || '').trim()
  if (!isCategoryId(id)) {
    return fail(
      name,
      `Invalid categoryId "${id}". Use one of: ${MOLECULE_CATEGORY_IDS.join(', ')}`,
    )
  }
  if (!ctx.refreshCategory) {
    return fail(name, 'retry_category is not available in this view (no profile refresh hook).')
  }
  ctx.refreshCategory(id)
  return ok(
    name,
    `Requested soft re-fetch of category "${id}". Panels will update when the request completes.`,
    { sideEffect: 'retry_category', categoryId: id },
  )
}

export function toolLoadCategory(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const id = String(args.categoryId || '').trim()
  if (!isCategoryId(id)) {
    return fail(
      name,
      `Invalid categoryId "${id}". Use one of: ${MOLECULE_CATEGORY_IDS.join(', ')}`,
    )
  }
  if (!ctx.loadCategory) {
    return fail(name, 'load_category is not available in this view.')
  }
  ctx.loadCategory(id)
  return ok(name, `Requested load of category "${id}" (if idle).`, {
    sideEffect: 'load_category',
    categoryId: id,
  })
}

export function toolOpenPanel(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const panelId = String(args.panelId || args.panel || args.panelKey || '').trim()
  if (!panelId) return fail(name, 'Missing panelId argument')
  let categoryId: CategoryId | undefined
  const rawCat = String(args.categoryId || '').trim()
  if (rawCat && isCategoryId(rawCat)) categoryId = rawCat
  if (!categoryId) {
    for (const cat of CATEGORIES) {
      if (cat.panels.some((p) => p.id === panelId || p.propKey === panelId)) {
        categoryId = cat.id as CategoryId
        break
      }
    }
  }
  if (categoryId && (ctx.categoryStatus[categoryId] || 'idle') === 'idle' && ctx.loadCategory) {
    ctx.loadCategory(categoryId)
  }
  if (!ctx.openPanel) {
    return fail(
      name,
      'open_panel is not available in this view (no panel navigation hook). Use the Monitor tab Open link instead.',
    )
  }
  ctx.openPanel(panelId, categoryId)
  return ok(name, `Opened panel "${panelId}"${categoryId ? ` (category ${categoryId})` : ''}.`, {
    sideEffect: 'open_panel',
    panelId,
    categoryId,
  })
}

export function toolFixGap(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const panelKey = String(args.panelKey || args.panelId || args.panel || '')
    .trim()
    .toLowerCase()
  const catArg = String(args.categoryId || '').trim()
  let gap = ctx.snapshot.gaps.find((g) => {
    if (catArg && g.categoryId === catArg) {
      if (!panelKey) return true
      return (
        g.panelKey?.toLowerCase() === panelKey ||
        g.panelId?.toLowerCase() === panelKey ||
        g.title.toLowerCase().includes(panelKey)
      )
    }
    if (!panelKey) return false
    return (
      g.panelKey?.toLowerCase() === panelKey ||
      g.panelId?.toLowerCase() === panelKey ||
      g.title.toLowerCase().includes(panelKey)
    )
  })
  if (!gap && catArg && isCategoryId(catArg)) {
    const st = ctx.categoryStatus[catArg] || 'idle'
    if (st === 'error' && ctx.refreshCategory) {
      ctx.refreshCategory(catArg)
      return ok(name, `No snapshot gap matched; retried category "${catArg}" (status error).`, {
        sideEffect: 'retry_category',
        categoryId: catArg,
      })
    }
    if (st === 'idle' && ctx.loadCategory) {
      ctx.loadCategory(catArg)
      return ok(name, `No snapshot gap matched; requested load of idle category "${catArg}".`, {
        sideEffect: 'load_category',
        categoryId: catArg,
      })
    }
  }
  if (!gap) {
    gap = ctx.snapshot.gaps.find((g) => g.actionable) || ctx.snapshot.gaps[0]
  }
  if (!gap) {
    return ok(name, 'No gaps to fix — retrieval looks complete for loaded categories.', {
      data: { fixed: false },
    })
  }
  if (gap.reason === 'error' || gap.reason === 'timeout') {
    if (!ctx.refreshCategory) {
      return fail(name, `Gap "${gap.title}" needs retry but refresh is unavailable.`)
    }
    ctx.refreshCategory(gap.categoryId)
    return ok(
      name,
      `Retrying category "${gap.categoryId}" for gap: ${gap.title} (${gap.reason}).`,
      { sideEffect: 'retry_category', categoryId: gap.categoryId, data: { gap, action: 'retry' } },
    )
  }
  if (gap.reason === 'pending' || (ctx.categoryStatus[gap.categoryId] || 'idle') === 'idle') {
    if (!ctx.loadCategory) {
      return fail(name, `Gap "${gap.title}" needs load but load hook is unavailable.`)
    }
    ctx.loadCategory(gap.categoryId)
    return ok(name, `Loading category "${gap.categoryId}" for gap: ${gap.title}.`, {
      sideEffect: 'load_category',
      categoryId: gap.categoryId,
      data: { gap, action: 'load' },
    })
  }
  if (gap.reason === 'empty') {
    return ok(
      name,
      `Gap "${gap.title}" is empty data from free APIs (not a fetch failure). Cannot invent rows; try another source panel or accept empty.`,
      { data: { gap, action: 'none_empty' } },
    )
  }
  return ok(name, `Gap "${gap.title}" (${gap.reason}) has no automatic fix.`, {
    data: { gap, action: 'none' },
  })
}

// ── Session ────────────────────────────────────────────────────────────────

export function toolListSessionMolecules(name: CopilotToolName): ToolResult {
  const recent = sessionHistory.getRecentMolecules(8).map((m) => ({
    name: m.name,
    searchedAt: m.searchedAt,
  }))
  return ok(
    name,
    recent.length === 0
      ? 'No recent molecules in session history.'
      : recent.map((m) => `${m.name} (${m.searchedAt})`).join('; '),
    { data: recent },
  )
}

export function toolSuggestNextActions(
  name: CopilotToolName,
  ctx: CopilotToolContext,
): ToolResult {
  const actions: string[] = []
  const failedCats = new Set<CategoryId>()
  for (const g of ctx.snapshot.gaps) {
    if (g.reason === 'error' || g.reason === 'timeout') failedCats.add(g.categoryId)
  }
  failedCats.forEach((id) => {
    actions.push(`retry_category:${id}`)
  })
  for (const id of MOLECULE_CATEGORY_IDS) {
    if ((ctx.categoryStatus[id] || 'idle') === 'idle') {
      actions.push(`load_category:${id}`)
    }
  }
  const coreOrder = ['clinical-safety', 'bioactivity-targets', 'pharmaceutical']
  actions.sort((a, b) => {
    const ca = coreOrder.findIndex((c) => a.includes(c))
    const cb = coreOrder.findIndex((c) => b.includes(c))
    return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb)
  })
  const uniq = Array.from(new Set(actions)).slice(0, 8)
  return ok(
    name,
    uniq.length === 0
      ? 'No pending loads or failed categories — explore Insights or Ask a science question.'
      : `Suggested: ${uniq.join('; ')}`,
    { data: uniq },
  )
}

// ── Pack / RH / board ──────────────────────────────────────────────────────

export function toolGetPackClaims(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const projectId = resolveProjectId(args, ctx)
  if (!projectId) {
    return fail(name, 'Missing projectId. Pass projectId or open a profile with ?project=.')
  }
  const project = getProject(projectId)
  if (!project) return fail(name, `Project "${projectId}" not found in local storage.`)
  const packs = (project.packIndex ?? []).slice(0, 8).map((p) => ({
    id: p.id,
    title: p.title,
    claimCount: p.claimCount ?? p.claimIds?.length ?? 0,
    claimIdsSample: (p.claimIds ?? []).slice(0, 12),
    candidateCount: p.candidateCount,
    createdAt: p.createdAt,
  }))
  const promote = project.candidates
    .filter((c) => c.boardStatus === 'promote')
    .slice(0, 10)
    .map((c) => ({
      candidateId: c.candidateId,
      name: c.identity.name,
      cid: c.identity.pubchemCid,
      sources: c.evidenceBreadthSources?.slice(0, 6) ?? [],
      origins: c.origins?.slice(0, 4) ?? [],
    }))
  const totalClaimIds = packs.reduce((n, p) => n + p.claimCount, 0)
  return ok(
    name,
    packs.length === 0
      ? `Project "${project.name}" has no packs yet. Export a board pack first.`
      : `Project "${project.name}": ${packs.length} pack(s), ~${totalClaimIds} indexed claim id(s); ${promote.length} promote candidate(s).`,
    {
      data: {
        projectId: project.id,
        projectName: project.name,
        disease: project.disease?.name ?? null,
        packs,
        promoteEvidence: promote,
        note: 'Claim bodies live in pack export JSON; index holds claim ids only. No invented claims.',
      },
    },
  )
}

export function toolSeedResearchHypothesis(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const projectId = resolveProjectId(args, ctx)
  if (!projectId) {
    return fail(name, 'Missing projectId. Pass projectId or open a profile with ?project=.')
  }
  const project = getProject(projectId)
  if (!project) return fail(name, `Project "${projectId}" not found in local storage.`)
  const packIdArg = String(args.packId || '').trim()
  const packs = project.packIndex ?? []
  const entry = packIdArg ? packs.find((p) => p.id === packIdArg) : packs[0]
  if (!entry) {
    return fail(
      name,
      packs.length === 0
        ? 'No packs on this project — export a board pack before seeding RH.'
        : `Pack "${packIdArg}" not found on project.`,
    )
  }
  const claimIds = entry.claimIds ?? []
  const hyp = seedResearchHypothesisFromPack({
    projectId: project.id,
    packId: entry.id,
    packTitle: entry.title,
    claimIds,
    candidateIds: project.candidates.map((c) => c.candidateId),
    diseaseId: project.disease?.id,
    targetIds: project.targetIds,
  })
  const saved = saveResearchHypothesis(hyp)
  if (!saved.ok) {
    return fail(name, `Failed to save research hypothesis: ${saved.message}`)
  }
  return ok(
    name,
    `Seeded research hypothesis "${hyp.title}" (${claimIds.length} claim ids) from pack "${entry.title}". Open /projects/${project.id}/hypothesis/${hyp.id} to edit.`,
    {
      sideEffect: 'seed_rh',
      data: {
        hypothesisId: hyp.id,
        packId: entry.id,
        claimCount: claimIds.length,
        projectId: project.id,
        href: `/projects/${project.id}/hypothesis/${hyp.id}`,
      },
    },
  )
}

export function toolCompareBoard(
  name: CopilotToolName,
  args: Args,
  ctx: CopilotToolContext,
): ToolResult {
  const projectId = resolveProjectId(args, ctx)
  if (!projectId) {
    return fail(name, 'Missing projectId. Pass projectId or open a profile with ?project=.')
  }
  const project = getProject(projectId)
  if (!project) return fail(name, `Project "${projectId}" not found in local storage.`)
  const rows = project.candidates.slice(0, 50).map((c) => ({
    candidateId: c.candidateId,
    name: c.identity.name,
    cid: c.identity.pubchemCid,
    boardStatus: c.boardStatus ?? 'untriaged',
    composite: c.scores?.composite ?? null,
    axes: c.scores?.axes
      ? {
          efficacy: c.scores.axes.efficacy,
          clinicalStage: c.scores.axes.clinicalStage,
          safety: c.scores.axes.safety,
          novelty: c.scores.axes.novelty,
          identityTrust: c.scores.axes.identityTrust,
        }
      : null,
    sources: c.evidenceBreadthSources?.slice(0, 6) ?? [],
  }))
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    byStatus[r.boardStatus] = (byStatus[r.boardStatus] || 0) + 1
  }
  return ok(
    name,
    `Board "${project.name}": ${rows.length} candidates — ${Object.entries(byStatus)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ')}. Disease: ${project.disease?.name ?? '—'}.`,
    {
      data: {
        projectId: project.id,
        projectName: project.name,
        disease: project.disease?.name ?? null,
        targetIds: project.targetIds,
        statusCounts: byStatus,
        candidates: rows,
      },
    },
  )
}
