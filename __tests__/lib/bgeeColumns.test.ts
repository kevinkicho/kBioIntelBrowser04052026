import {
  bgeeColumnFlags,
  bgeeGridTemplate,
  bgeeSubtitle,
} from '@/lib/api/bgeeColumns'
import type { BgeeExpression } from '@/lib/types'

function row(partial: Partial<BgeeExpression>): BgeeExpression {
  return {
    geneId: 'ENSG1',
    geneSymbol: 'BRCA1',
    species: 'Homo sapiens',
    anatomicalEntityId: 'UBERON:0000310',
    anatomicalEntityName: 'breast',
    developmentalStageId: '',
    developmentalStageName: '',
    expressionLevel: 'present',
    expressionScore: 0,
    confidenceScore: 0,
    ...partial,
  }
}

describe('bgeeColumnFlags', () => {
  it('detects presence-only samples (no stage, no score)', () => {
    const flags = bgeeColumnFlags([
      row({ anatomicalEntityName: 'breast' }),
      row({ anatomicalEntityName: 'blood', anatomicalEntityId: 'UBERON:0000178' }),
    ])
    expect(flags.presenceOnly).toBe(true)
    expect(flags.hasStage).toBe(false)
    expect(flags.hasScore).toBe(false)
    expect(flags.hasOntology).toBe(true)
  })

  it('detects score and stage when present', () => {
    const flags = bgeeColumnFlags([
      row({
        developmentalStageName: 'adult stage',
        developmentalStageId: 'HsapDv:0000087',
        expressionScore: 92.4,
      }),
    ])
    expect(flags.presenceOnly).toBe(false)
    expect(flags.hasStage).toBe(true)
    expect(flags.hasScore).toBe(true)
  })
})

describe('bgeeGridTemplate / subtitle', () => {
  it('uses compact grid without stage/score columns for presence-only', () => {
    const flags = bgeeColumnFlags([row({})])
    const grid = bgeeGridTemplate(flags)
    expect(grid).toContain('grid-cols-')
    // 4 columns: anatomy, ontology, presence, open — no 6-col full template
    expect(grid).not.toContain('0.9fr)_minmax(4.5rem')
    expect(bgeeSubtitle(flags, 40)).toMatch(/presence calls/i)
    expect(bgeeSubtitle(flags, 40)).toMatch(/Stage and expression scores were not returned/i)
  })

  it('full grid when stage+score available', () => {
    const flags = bgeeColumnFlags([
      row({ developmentalStageName: 'adult', expressionScore: 10 }),
    ])
    expect(bgeeGridTemplate(flags)).toContain('0.9fr')
    expect(bgeeSubtitle(flags, 2)).toMatch(/developmental stage/i)
  })
})
