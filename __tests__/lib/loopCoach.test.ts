import { nextLoopCoachAdvice } from '@/lib/loop/loopCoach'

describe('loopCoach', () => {
  it('starts at campaign when no events', () => {
    const a = nextLoopCoachAdvice([])
    expect(a.stepId).toBe('start_discover')
    expect(a.progressPct).toBe(0)
  })

  it('advances after rank to save-to-board', () => {
    const a = nextLoopCoachAdvice([{ name: 'discover_rank_completed', props: { count: 5 } }])
    expect(a.stepId).toBe('save_to_board')
    expect(a.progressPct).toBeGreaterThan(0)
  })

  it('reaches loop_complete when full chain present', () => {
    const a = nextLoopCoachAdvice([
      { name: 'discover_rank_completed' },
      { name: 'board_candidate_added' },
      { name: 'pack_exported' },
      { name: 'research_hypothesis_opened' },
      { name: 'ui_surface_action', props: { surface: 'monday_pack', action: 'export' } },
    ])
    expect(a.stepId).toBe('loop_complete')
    expect(a.progressPct).toBe(100)
  })

  it('reaches loop_complete on campaign event set (promote, no board_candidate_added)', () => {
    const a = nextLoopCoachAdvice([
      { name: 'discover_rank_completed', props: { count: 5 } },
      { name: 'board_status_changed', props: { status: 'promote', candidateId: 'c1' } },
      { name: 'pack_exported', props: { count: 12, citable: 4 } },
      { name: 'research_hypothesis_opened', props: { hypId: 'h1' } },
      { name: 'ui_surface_action', props: { surface: 'monday_pack', action: 'export' } },
    ])
    expect(a.stepId).toBe('loop_complete')
    expect(a.progressPct).toBe(100)
  })

  it('does not treat watching as boarded', () => {
    const a = nextLoopCoachAdvice([
      { name: 'discover_rank_completed' },
      { name: 'board_status_changed', props: { status: 'watching' } },
    ])
    expect(a.stepId).toBe('save_to_board')
  })
})
