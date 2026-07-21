/**
 * @jest-environment node
 */

import {
  formatAiGeneration,
  formatAiGenerationPreview,
} from '../formatAiGeneration'

describe('formatAiGeneration', () => {
  it('formats board AI rank JSON into ranking preview', () => {
    const f = formatAiGeneration({
      kind: 'board_recommend',
      mode: 'board_recommend',
      content: JSON.stringify({
        ordering: [
          { key: 'a', name: 'Drug A', rank: 1, reasons: ['strong trials'] },
          { key: 'b', name: 'Drug B', rank: 2, reasons: ['safety gap'] },
        ],
        caveats: ['Non-of-record'],
        refused: false,
        generatedAt: '2026-01-01',
      }),
    })
    expect(f.kind).toBe('ai_rank')
    expect(f.wasJson).toBe(true)
    expect(f.preview).toMatch(/Drug A/)
    expect(f.ranking?.[0].name).toBe('Drug A')
    expect(f.caveats?.[0]).toMatch(/Non-of-record/)
  })

  it('formats pack structured insight without dumping JSON', () => {
    const f = formatAiGeneration({
      kind: 'pack',
      mode: 'pack_executive_brief',
      content: JSON.stringify({
        summary: 'Evidence supports a focused safety review.',
        claimIds: ['ec:1', 'ec:2'],
        nextSteps: ['Pull FAERS', 'Check trials'],
        risks: ['Sparse AE panel'],
      }),
    })
    expect(f.kind).toBe('structured_insight')
    expect(f.summary).toMatch(/safety review/)
    expect(f.nextSteps).toHaveLength(2)
    expect(f.preview).not.toMatch(/\{/)
  })

  it('formats RH insight with rivals and experiments', () => {
    const f = formatAiGeneration({
      kind: 'rh',
      mode: 'rh_thesis_draft',
      task: {
        summary: 'Thesis draft from claims',
        claimIds: ['c1'],
        sections: { workingClaim: 'X inhibits Y' },
        rivals: [{ role: 'rival', title: 'Alt path', thesis: 'Maybe Z' }],
        experiments: [{ description: 'Assay binding', priority: 'high' }],
      },
    })
    expect(f.kind).toBe('rh_insight')
    expect(f.sections?.workingClaim).toMatch(/inhibits/)
    expect(f.rivals?.[0].title).toBe('Alt path')
    expect(f.experiments?.[0].description).toMatch(/Assay/)
  })

  it('uses prose for free text', () => {
    const f = formatAiGeneration({
      kind: 'disease',
      mode: 'disease_summary',
      content: 'This is a plain language summary of the disease.',
    })
    expect(f.kind).toBe('prose')
    expect(f.wasJson).toBe(false)
    expect(formatAiGenerationPreview({ kind: 'disease', mode: 'x', content: 'Hello world' })).toBe(
      'Hello world',
    )
  })

  it('surfaces errors cleanly', () => {
    const f = formatAiGeneration({
      kind: 'pack',
      mode: 'pack_gap_analysis',
      content: '',
      error: 'Ollama unavailable',
    })
    expect(f.kind).toBe('error')
    expect(f.preview).toMatch(/Ollama/)
  })
})
