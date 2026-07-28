/**
 * Evidence-first AI: density gates + deterministic artifacts.
 */

import { buildMoleculeDataHub } from '@/lib/dataHub'
import {
  buildDeterministicNextActions,
  buildDeterministicPriorArtQuery,
  buildDeterministicSafetyMemo,
  formatSafetyMemoAsText,
} from '@/lib/ai/aiTasks/deterministicArtifacts'
import {
  buildFailClosedMessage,
  computeEvidenceGrounding,
  modeRequiresDeepDensity,
  DEFAULT_DEEP_THRESHOLDS,
} from '@/lib/ai/copilot/evidenceDensity'
import { buildMoleculeContext } from '@/lib/ai/copilot/context'
import { buildRetrievalSnapshot } from '@/lib/ai/copilot/retrieval'
import { minClaimsForPackMode } from '@/lib/ai/contracts'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

function richBags() {
  return {
    clinicalTrials: Array.from({ length: 8 }, (_, i) => ({
      nctId: `NCT000${i}`,
      title: `Trial ${i}`,
      phase: 'PHASE3',
      status: 'COMPLETED',
      conditions: ['Pain'],
      sponsor: 'NIH',
      enrollment: 100 + i,
    })),
    adverseEvents: [
      { reactionName: 'Nausea', count: 200, serious: 10 },
      { reactionName: 'Headache', count: 150, serious: 5 },
      { reactionName: 'Gastric ulcer', count: 40, serious: 20 },
    ],
    chemblMechanisms: [
      {
        mechanismOfAction: 'Cyclooxygenase inhibitor',
        actionType: 'INHIBITOR',
        targetName: 'PTGS1',
        directInteraction: true,
        maxPhase: 4,
      },
      {
        mechanismOfAction: 'COX-2 inhibitor',
        actionType: 'INHIBITOR',
        targetName: 'PTGS2',
        directInteraction: true,
        maxPhase: 4,
      },
    ],
    chemblActivities: [
      {
        targetName: 'PTGS1',
        targetOrganism: 'Homo sapiens',
        standardType: 'IC50',
        standardValue: 10,
        standardUnits: 'nM',
        pchemblValue: 8,
        assayType: 'B',
      },
      {
        targetName: 'PTGS2',
        targetOrganism: 'Homo sapiens',
        standardType: 'IC50',
        standardValue: 20,
        standardUnits: 'nM',
        pchemblValue: 7.7,
        assayType: 'B',
      },
    ],
    chemblIndications: [
      { indication: 'Pain', maxPhase: 4 },
      { meshHeading: 'Fever', maxPhase: 4 },
    ],
    literature: [{ title: 'Aspirin review', year: 2020, doi: '10.1/asp' }],
  }
}

function buildCtx(bags: Record<string, unknown>) {
  const categoryData = {
    'clinical-safety': bags,
    'bioactivity-targets': bags,
    'molecular-chemical': bags,
  } as Partial<Record<CategoryId, Record<string, unknown>>>
  const status = {
    'clinical-safety': 'loaded',
    'bioactivity-targets': 'loaded',
    'molecular-chemical': 'loaded',
  } as Record<CategoryId, CategoryLoadState>
  const snapshot = buildRetrievalSnapshot(categoryData, status, {})
  const ctx = buildMoleculeContext(
    categoryData,
    { name: 'Aspirin', cid: 2244, molecularWeight: 180 },
    bags,
    snapshot,
  )
  return { ctx, snapshot, status }
}

describe('evidence density', () => {
  it('flags thin bags as cannot deep synthesize', () => {
    const { ctx, snapshot } = buildCtx({})
    const g = computeEvidenceGrounding(ctx, snapshot, {})
    expect(g.canDeepSynthesize).toBe(false)
    expect(g.blockReason).toBeTruthy()
    expect(modeRequiresDeepDensity('executive_brief')).toBe(true)
    expect(modeRequiresDeepDensity('prior_art_query')).toBe(false)
    expect(buildFailClosedMessage(g, 'executive_brief')).toMatch(/Insufficient evidence/)
  })

  it('passes deep gate with dense named rows', () => {
    const bags = richBags()
    const { ctx, snapshot, status } = buildCtx(bags)
    // Simulate many panels with data
    const fatSnapshot = {
      ...snapshot,
      totalApisSucceeded: 12,
      totalApisCalled: 20,
      overallCompleteness: 0.6,
      gaps: [],
      anomalies: [],
    }
    const g = computeEvidenceGrounding(
      ctx,
      fatSnapshot as typeof snapshot,
      status as Partial<Record<CategoryId, string>>,
      DEFAULT_DEEP_THRESHOLDS,
    )
    expect(g.namedEvidenceRows).toBeGreaterThanOrEqual(12)
    expect(g.canDeepSynthesize).toBe(true)
    expect(g.badgeLine).toMatch(/trials/)
  })
})

describe('deterministic artifacts', () => {
  it('builds prior-art query with name and targets', () => {
    const { ctx } = buildCtx(richBags())
    const q = buildDeterministicPriorArtQuery(ctx)
    expect(q.query).toMatch(/Aspirin/i)
    expect(q.query).toMatch(/AND/)
    expect(q.grounded).toBe(true)
  })

  it('builds safety memo with AE rows and honesty', () => {
    const { ctx } = buildCtx(richBags())
    const memo = buildDeterministicSafetyMemo(ctx)
    expect(memo.rows.length).toBeGreaterThan(0)
    expect(memo.honesty.some((h) => /incidence/i.test(h))).toBe(true)
    const text = formatSafetyMemoAsText(memo)
    expect(text).toMatch(/Nausea|Headache|Gastric/)
    expect(text).toMatch(/Aspirin/)
  })

  it('builds next actions from missing core', () => {
    const { ctx, snapshot } = buildCtx(richBags())
    const g = computeEvidenceGrounding(ctx, snapshot, {
      'clinical-safety': 'idle',
      'bioactivity-targets': 'idle',
    })
    const next = buildDeterministicNextActions(ctx, g, {
      'clinical-safety': 'idle',
      'bioactivity-targets': 'idle',
    })
    expect(next.actions.length).toBeGreaterThan(0)
    expect(next.entities.length).toBeGreaterThan(0)
  })
})

describe('pack AI density thresholds', () => {
  it('requires more claims for executive brief than gap analysis', () => {
    expect(minClaimsForPackMode('pack_executive_brief')).toBeGreaterThanOrEqual(10)
    expect(minClaimsForPackMode('pack_gap_analysis')).toBeGreaterThanOrEqual(3)
    expect(minClaimsForPackMode('pack_red_team')).toBeGreaterThanOrEqual(8)
  })
})

describe('hub still of-record independent of AI', () => {
  it('molecule hub builds without AI', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      richBags(),
    )
    expect(ledger.rows.length).toBeGreaterThan(0)
  })
})
