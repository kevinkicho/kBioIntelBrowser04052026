import {
  AXIS_ORDER,
  buildMoleculeLinkUrl,
  MOLECULE_LINK_SCORES_MAX_ENCODED,
} from '@/lib/profileMode'
import { createDefaultScoreRubric, createEmptyScoreVector } from '@/lib/domain'

describe('AXIS_ORDER (V2-01 clinicalStage-first)', () => {
  it('orders clinicalStage before efficacy', () => {
    expect(AXIS_ORDER).toEqual([
      'clinicalStage',
      'efficacy',
      'safety',
      'novelty',
      'identityTrust',
    ])
  })
})

describe('buildMoleculeLinkUrl', () => {
  it('always includes composite score and discover context', () => {
    const url = buildMoleculeLinkUrl({
      cid: 2244,
      rank: 1,
      diseaseName: 'ATTR',
      score: 0.72,
    })
    expect(url).toMatch(/^\/molecule\/2244\?/)
    const q = new URL(url, 'http://local').searchParams
    expect(q.get('from')).toBe('discover')
    expect(q.get('disease')).toBe('ATTR')
    expect(q.get('rank')).toBe('1')
    expect(q.get('score')).toBe('0.72')
    expect(q.get('scores')).toBeNull()
  })

  it('attaches scores JSON when under length gate', () => {
    const scores = createEmptyScoreVector('cheap', createDefaultScoreRubric('balanced'))
    scores.composite = 0.5
    scores.axes.efficacy = 0.6
    scores.axisStatus.efficacy = 'computed'
    const url = buildMoleculeLinkUrl({
      cid: 2244,
      rank: 2,
      diseaseName: 'EGFR',
      score: 0.5,
      scores,
    })
    const q = new URL(url, 'http://local').searchParams
    expect(q.get('scores')).toBeTruthy()
    const parsed = JSON.parse(q.get('scores')!)
    expect(parsed.composite).toBe(0.5)
  })

  it('omits scores when encoded length exceeds gate', () => {
    const scores = createEmptyScoreVector('cheap', createDefaultScoreRubric('balanced'))
    scores.composite = 0.5
    // Pad with many safety flags to blow past ~1500 encoded chars
    scores.safetyFlags = Array.from({ length: 80 }, (_, i) => ({
      kind: 'ae_burden' as const,
      severity: 'warn' as const,
      label: `Very long adverse event safety flag label number ${i} padding text`,
    }))
    const encoded = encodeURIComponent(JSON.stringify(scores))
    expect(encoded.length).toBeGreaterThan(MOLECULE_LINK_SCORES_MAX_ENCODED)

    const url = buildMoleculeLinkUrl({
      cid: 2244,
      rank: 1,
      diseaseName: 'ATTR',
      score: 0.5,
      scores,
    })
    const q = new URL(url, 'http://local').searchParams
    expect(q.get('score')).toBe('0.50')
    expect(q.get('scores')).toBeNull()
  })

  it('includes project id when provided', () => {
    const url = buildMoleculeLinkUrl({
      cid: 1,
      rank: 1,
      diseaseName: 'X',
      score: 0.1,
      projectId: 'prj_abc',
    })
    expect(new URL(url, 'http://local').searchParams.get('project')).toBe('prj_abc')
  })
})
