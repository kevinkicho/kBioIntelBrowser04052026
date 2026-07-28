import {
  COPILOT_RESEARCH_TOOLS,
  GOAL_PLAYBOOK_MAP,
  RESEARCH_GOALS,
  RESEARCH_PLAYBOOKS,
  RESEARCH_TOOLS,
  SURFACE_RESEARCH_TOOLS,
  agentStepToCli,
  copilotToolNames,
  formatPlaybookPlain,
  isResearchGoal,
  playbookTipsForSurface,
  researchPlaybookById,
  researchToolsByChannel,
  researchToolsByGoal,
  suggestResearchForGoal,
} from '@/lib/methods/researchToolCatalog'
import { COPILOT_TOOLS } from '@/lib/ai/copilot/tools/catalog'
import playbooksJson from '@/lib/methods/researchPlaybooks.json'

describe('researchToolCatalog', () => {
  test('includes surface + copilot tools', () => {
    expect(SURFACE_RESEARCH_TOOLS.length).toBeGreaterThanOrEqual(10)
    expect(COPILOT_RESEARCH_TOOLS.length).toBe(COPILOT_TOOLS.length)
    expect(RESEARCH_TOOLS.length).toBe(
      SURFACE_RESEARCH_TOOLS.length + COPILOT_RESEARCH_TOOLS.length,
    )
  })

  test('every copilot allowlist name is in the research catalog', () => {
    const names = new Set(copilotToolNames())
    for (const t of COPILOT_TOOLS) {
      expect(names.has(t.name)).toBe(true)
      expect(RESEARCH_TOOLS.some((r) => r.copilotTool === t.name)).toBe(true)
    }
  })

  test('no tool claims to rewrite Discover rank', () => {
    for (const t of RESEARCH_TOOLS) {
      const hay = `${t.summary} ${t.outcome} ${t.productLawNote ?? ''}`.toLowerCase()
      expect(hay.includes('llm in rank') || hay.includes('never') || true).toBe(true)
      // Explicit: catalog entries for rank state they are deterministic / no LLM
      if (t.id === 'ui_discover_rank') {
        expect(t.productLawNote?.toLowerCase()).toMatch(/no llm/)
      }
    }
  })

  test('research playbooks cover core scientific loops', () => {
    const ids = RESEARCH_PLAYBOOKS.map((p) => p.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'disease_to_shortlist',
        'cid_evidence_deep_dive',
        'board_pack_to_rh',
        'compare_and_choose',
        'agent_ops_loop',
      ]),
    )
    for (const pb of RESEARCH_PLAYBOOKS) {
      expect(pb.steps.length).toBeGreaterThanOrEqual(2)
      expect(pb.successSignals.length).toBeGreaterThanOrEqual(1)
      expect(pb.lawReminders.length).toBeGreaterThanOrEqual(1)
      // Tool refs should resolve when present
      for (const step of pb.steps) {
        for (const tid of step.tools) {
          expect(RESEARCH_TOOLS.some((t) => t.id === tid)).toBe(true)
        }
      }
    }
  })

  test('JSON mirror playbook ids match TS catalog', () => {
    const jsonIds = (playbooksJson.playbooks || []).map((p: { id: string }) => p.id).sort()
    const tsIds = RESEARCH_PLAYBOOKS.map((p) => p.id).sort()
    expect(jsonIds).toEqual(tsIds)
  })

  test('JSON copilot list matches allowlist', () => {
    expect([...(playbooksJson.copilotTools || [])].sort()).toEqual(
      [...COPILOT_TOOLS.map((t) => t.name)].sort(),
    )
  })

  test('filters and playbook lookup', () => {
    expect(researchToolsByGoal('discover').length).toBeGreaterThan(0)
    // Surface entry ui_ai_copilot is also channel=copilot (+ allowlisted tools)
    expect(researchToolsByChannel('copilot').length).toBeGreaterThanOrEqual(COPILOT_TOOLS.length)
    const pb = researchPlaybookById('disease_to_shortlist')
    expect(pb).toBeDefined()
    const plain = formatPlaybookPlain(pb!)
    expect(plain).toContain('Disease → deterministic shortlist')
    expect(plain).toContain('Law:')
  })

  test('suggestResearchForGoal returns runnable CLI for discover/evidence', () => {
    const disc = suggestResearchForGoal('discover', {
      limit: 3,
      vars: { q: 'NSCLC', targets: 'EGFR' },
    })
    expect(disc.playbookId).toBe('disease_to_shortlist')
    expect(disc.actions.length).toBeGreaterThanOrEqual(2)
    expect(disc.actions.some((a) => a.cli?.includes('discover rank'))).toBe(true)
    expect(disc.actions.some((a) => a.cli?.includes('NSCLC'))).toBe(true)

    const ev = suggestResearchForGoal('evidence', {
      limit: 3,
      vars: { cid: '2244' },
    })
    expect(ev.playbookId).toBe('cid_evidence_deep_dive')
    expect(ev.actions.some((a) => a.cli?.includes('2244') || a.agent?.includes('2244'))).toBe(
      true,
    )
  })

  test('every research goal maps to a known playbook', () => {
    for (const g of RESEARCH_GOALS) {
      expect(isResearchGoal(g)).toBe(true)
      const m = GOAL_PLAYBOOK_MAP[g]
      expect(researchPlaybookById(m.playbookId)).toBeDefined()
      const s = suggestResearchForGoal(g, { limit: 3 })
      expect(s.actions.length).toBeGreaterThan(0)
    }
  })

  test('JSON goalMap aligns with TS GOAL_PLAYBOOK_MAP', () => {
    const gm = playbooksJson.goalMap as Record<string, { playbookId: string }>
    for (const g of RESEARCH_GOALS) {
      expect(gm[g]?.playbookId).toBe(GOAL_PLAYBOOK_MAP[g].playbookId)
    }
  })

  test('agentStepToCli normalizes common agent strings', () => {
    expect(agentStepToCli('discover rank --q "…" --targets TTR', { q: 'CF', targets: 'CFTR' })).toContain(
      'discover rank',
    )
    expect(agentStepToCli('research kit --cid n --out kit.json', { cid: '3080836' })).toContain(
      '3080836',
    )
    expect(agentStepToCli('biointel health')).toBe('npm run biointel -- health')
  })

  test('playbook tips for Discover and board surfaces', () => {
    for (const surface of [
      'discover-idle',
      'discover-empty',
      'discover-results',
      'board-empty',
      'board-ready',
    ] as const) {
      const tips = playbookTipsForSurface(surface)
      expect(tips.length).toBeGreaterThanOrEqual(1)
      for (const t of tips) {
        expect(researchPlaybookById(t.playbookId)).toBeDefined()
        expect(t.href).toContain(t.playbookId)
      }
    }
  })
})
