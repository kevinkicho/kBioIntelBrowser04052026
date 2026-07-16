import { validatePackAiOutput } from '@/lib/ai/validateOutput'

describe('validatePackAiOutput', () => {
  const allow = ['ec:aaa', 'ec:bbb', 'ec:ccc']

  test('accepts valid JSON with allowlisted claim ids', () => {
    const raw = JSON.stringify({
      summary: 'Strong COX signal',
      claimIds: ['ec:aaa', 'ec:bbb'],
      confidence: 'medium',
      nextSteps: ['Check AE panel'],
    })
    const r = validatePackAiOutput(raw, allow, 'pack_executive_brief')
    expect(r.ok).toBe(true)
    expect(r.refused).toBe(false)
    expect(r.insight?.claimIds).toEqual(['ec:aaa', 'ec:bbb'])
  })

  test('strips orphan claim ids', () => {
    const raw = JSON.stringify({
      summary: 'Invented ids',
      claimIds: ['ec:aaa', 'ec:FAKE'],
      confidence: 'high',
    })
    const r = validatePackAiOutput(raw, allow, 'pack_executive_brief')
    expect(r.insight?.claimIds).toEqual(['ec:aaa'])
    expect(r.errors.some((e) => e.startsWith('orphan_claim_ids'))).toBe(true)
  })

  test('refuses when all claim ids are orphans and mode needs claims', () => {
    const raw = JSON.stringify({
      summary: 'All bad',
      claimIds: ['ec:FAKE'],
      confidence: 'high',
    })
    const r = validatePackAiOutput(raw, allow, 'pack_executive_brief')
    expect(r.refused).toBe(true)
  })

  test('insufficient when allowlist too small', () => {
    const raw = JSON.stringify({
      summary: 'Too thin',
      claimIds: ['ec:aaa'],
      confidence: 'high',
    })
    const r = validatePackAiOutput(raw, ['ec:aaa'], 'pack_executive_brief')
    expect(r.refused).toBe(true)
    expect(r.insight?.confidence).toBe('insufficient')
  })

  test('parses fenced JSON', () => {
    const raw = '```json\n{"summary":"ok","claimIds":["ec:aaa","ec:bbb","ec:ccc"],"confidence":"low"}\n```'
    const r = validatePackAiOutput(raw, allow, 'pack_gap_analysis')
    expect(r.ok).toBe(true)
    expect(r.insight?.summary).toBe('ok')
  })
})
