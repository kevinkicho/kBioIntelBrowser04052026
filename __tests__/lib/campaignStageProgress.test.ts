/**
 * Campaign stages driven by product events (v3 G1 coherence).
 */
import {
  CAMPAIGN_PROGRESS_EVENT_NAMES,
  STAGE_EVENT_RULES,
  autoCompletedStagesFromEvents,
  campaignProgressPercent,
  mergeCampaignStageProgress,
} from '@/lib/campaign/campaignStageProgress'
import { CAMPAIGN_TEMPLATES } from '@/lib/campaign/campaignWorkspace'
import type { CampaignStageId } from '@/lib/campaign/campaignWorkspace'

const REPURPOSING = CAMPAIGN_TEMPLATES.find((t) => t.id === 'campaign-repurposing')!
const STAGE_IDS = REPURPOSING.stages.map((s) => s.id)

describe('campaignStageProgress', () => {
  it('exposes rules for every stage id used by templates', () => {
    const ruleIds = new Set(STAGE_EVENT_RULES.map((r) => r.stageId))
    for (const t of CAMPAIGN_TEMPLATES) {
      for (const s of t.stages) {
        expect(ruleIds.has(s.id)).toBe(true)
      }
    }
  })

  it('lists canonical event names without dual-emit aliases', () => {
    expect(CAMPAIGN_PROGRESS_EVENT_NAMES).toContain('discover_rank_completed')
    expect(CAMPAIGN_PROGRESS_EVENT_NAMES).toContain('pack_exported')
    expect(CAMPAIGN_PROGRESS_EVENT_NAMES).toContain('research_hypothesis_opened')
  })

  it('auto-completes rank path from discover events', () => {
    const auto = autoCompletedStagesFromEvents(
      [
        { name: 'discover_started', props: { targetCount: 2 } },
        { name: 'discover_rank_completed', props: { count: 10, ms: 1200 } },
      ],
      STAGE_IDS,
    )
    expect(auto).toContain('disease_confirm')
    expect(auto).toContain('pin_targets')
    expect(auto).toContain('rank_shortlist')
    expect(auto).not.toContain('evidence_pack')
  })

  it('auto-completes promote + pack + RH + monday from loop events', () => {
    const auto = autoCompletedStagesFromEvents(
      [
        { name: 'discover_disease_confirmed', props: { diseaseId: 'EFO_0000001' } },
        { name: 'discover_rank_completed', props: { count: 5 } },
        { name: 'board_status_changed', props: { status: 'promote', candidateId: 'c1' } },
        { name: 'harvest_safety_done', props: { count: 1 } },
        { name: 'pack_exported', props: { count: 12, citable: 4 } },
        { name: 'research_hypothesis_opened', props: { hypId: 'h1' } },
        { name: 'ui_surface_action', props: { surface: 'monday_pack', action: 'export' } },
      ],
      STAGE_IDS,
    )
    expect(auto).toEqual(
      expect.arrayContaining([
        'disease_confirm',
        'pin_targets',
        'rank_shortlist',
        'promote_harvest',
        'evidence_pack',
        'research_hypothesis',
        'monday_experiment',
      ]),
    )
    expect(auto).toHaveLength(STAGE_IDS.length)
  })

  it('does not treat watching as promote', () => {
    const auto = autoCompletedStagesFromEvents(
      [{ name: 'board_status_changed', props: { status: 'watching' } }],
      STAGE_IDS,
    )
    expect(auto).not.toContain('promote_harvest')
  })

  it('scopes to template stages (rare has no promote_harvest)', () => {
    const rare = CAMPAIGN_TEMPLATES.find((t) => t.id === 'campaign-rare')!
    const rareIds = rare.stages.map((s) => s.id) as CampaignStageId[]
    expect(rareIds).not.toContain('promote_harvest')
    const auto = autoCompletedStagesFromEvents(
      [
        { name: 'board_status_changed', props: { status: 'promote' } },
        { name: 'pack_exported', props: { count: 1 } },
      ],
      rareIds,
    )
    expect(auto).toContain('evidence_pack')
    expect(auto).not.toContain('promote_harvest' as CampaignStageId)
  })

  it('merges manual checkboxes with event auto-progress', () => {
    const snap = mergeCampaignStageProgress(
      [{ name: 'discover_rank_completed', props: { count: 3 } }],
      STAGE_IDS,
      ['monday_experiment'],
    )
    expect(snap.autoDone).toContain('rank_shortlist')
    expect(snap.effectiveDone).toContain('rank_shortlist')
    expect(snap.effectiveDone).toContain('monday_experiment')
    expect(snap.sources.rank_shortlist).toBe('event')
    expect(snap.sources.monday_experiment).toBe('manual')
  })

  it('marks both when manual and event agree', () => {
    const snap = mergeCampaignStageProgress(
      [{ name: 'pack_exported', props: { count: 1 } }],
      STAGE_IDS,
      ['evidence_pack'],
    )
    expect(snap.sources.evidence_pack).toBe('both')
  })

  it('computes progress percent', () => {
    expect(campaignProgressPercent(0, 7)).toBe(0)
    expect(campaignProgressPercent(7, 7)).toBe(100)
    expect(campaignProgressPercent(1, 4)).toBe(25)
    expect(campaignProgressPercent(0, 0)).toBe(0)
  })

  it('accepts next_experiment surface for monday stage', () => {
    const auto = autoCompletedStagesFromEvents(
      [{ name: 'ui_surface_action', props: { surface: 'next_experiment', action: 'add' } }],
      STAGE_IDS,
    )
    expect(auto).toEqual(['monday_experiment'])
  })
})
