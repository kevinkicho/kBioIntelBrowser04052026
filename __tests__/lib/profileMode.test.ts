import {
  AXIS_ORDER,
  DECISION_CATEGORY_IDS,
  DECISION_PANEL_IDS,
  corePanelInputFromMerged,
  defaultProfileMode,
  decisionCategoriesReady,
  extractDecisionStripClaims,
  isDecisionPanel,
  isProfileMode,
  listDecisionPanels,
  parseCompositeScoreParam,
  parseProfileMode,
  scoreVectorFromSearchParams,
} from '@/lib/profileMode'
import {
  FIXTURE_CORE_PANELS,
  FIXTURE_RETRIEVED_AT,
} from '@/lib/evidence/fixtures/corePanels'

describe('profileMode', () => {
  describe('DECISION_PANEL_IDS (Core six)', () => {
    it('matches design §4.3 decision panels', () => {
      expect([...DECISION_PANEL_IDS]).toEqual([
        'chembl-mechanisms',
        'chembl',
        'clinical-trials',
        'adverse-events',
        'chembl-indications',
        'properties',
      ])
    })

    it('all decision panels resolve in CATEGORIES', () => {
      const listed = listDecisionPanels()
      expect(listed).toHaveLength(6)
      expect(listed.every(p => isDecisionPanel(p.id))).toBe(true)
    })

    it('decision categories cover clinical, bioactivity, molecular', () => {
      expect(DECISION_CATEGORY_IDS).toContain('clinical-safety')
      expect(DECISION_CATEGORY_IDS).toContain('bioactivity-targets')
      expect(DECISION_CATEGORY_IDS).toContain('molecular-chemical')
      // Decision categories load before pharma in decision mode
      expect(DECISION_CATEGORY_IDS[0]).toBe('clinical-safety')
    })
  })

  describe('parseProfileMode', () => {
    it('accepts decision, full, and browser alias', () => {
      expect(parseProfileMode('decision')).toBe('decision')
      expect(parseProfileMode('full')).toBe('full')
      expect(parseProfileMode('browser')).toBe('full')
      expect(parseProfileMode('DECISION')).toBe('decision')
      expect(parseProfileMode('nope')).toBeNull()
      expect(parseProfileMode(null)).toBeNull()
    })

    it('isProfileMode type guard', () => {
      expect(isProfileMode('decision')).toBe(true)
      expect(isProfileMode('full')).toBe(true)
      expect(isProfileMode('browser')).toBe(false)
    })
  })

  describe('defaultProfileMode', () => {
    it('defaults to decision from discover/project/disease context', () => {
      expect(defaultProfileMode({ fromDiscover: true })).toBe('decision')
      expect(defaultProfileMode({ hasProject: true })).toBe('decision')
      expect(defaultProfileMode({ hasDisease: true })).toBe('decision')
    })

    it('defaults to full browser otherwise', () => {
      expect(defaultProfileMode({})).toBe('full')
    })
  })

  describe('scores from search params', () => {
    it('parses 0–1 and 0–100 composites', () => {
      expect(parseCompositeScoreParam('0.72')).toBeCloseTo(0.72)
      expect(parseCompositeScoreParam('72')).toBeCloseTo(0.72)
      expect(parseCompositeScoreParam('')).toBeNull()
    })

    it('builds composite-only ScoreVector from score=', () => {
      const v = scoreVectorFromSearchParams({ score: '0.55' })
      expect(v).not.toBeNull()
      expect(v!.composite).toBeCloseTo(0.55)
      expect(v!.axes.efficacy).toBeNull()
      expect(AXIS_ORDER.every(k => v!.axisStatus[k] === 'not-retrieved')).toBe(true)
    })

    it('parses full scores JSON when valid', () => {
      const v = scoreVectorFromSearchParams({
        scores: JSON.stringify({
          composite: 0.8,
          axes: {
            efficacy: 0.9,
            clinicalStage: 0.7,
            safety: 0.6,
            novelty: 0.2,
            identityTrust: 1,
          },
          axisStatus: {
            efficacy: 'computed',
            clinicalStage: 'computed',
            safety: 'computed',
            novelty: 'computed',
            identityTrust: 'computed',
          },
          rubricVersion: 1,
          scorePhase: 'full',
        }),
      })
      expect(v!.axes.efficacy).toBe(0.9)
      expect(v!.scorePhase).toBe('full')
    })
  })

  describe('decisionCategoriesReady', () => {
    it('true when all decision categories loaded or error', () => {
      const status: Record<string, string> = {}
      for (const id of DECISION_CATEGORY_IDS) status[id] = 'loaded'
      expect(decisionCategoriesReady(status)).toBe(true)
      status[DECISION_CATEGORY_IDS[0]] = 'error'
      expect(decisionCategoriesReady(status)).toBe(true)
      status[DECISION_CATEGORY_IDS[0]] = 'loading'
      expect(decisionCategoriesReady(status)).toBe(false)
    })
  })

  describe('extractDecisionStripClaims', () => {
    it('extracts claims from merged Core panel DTOs', () => {
      const claims = extractDecisionStripClaims(
        {
          chemblActivities: FIXTURE_CORE_PANELS.chemblActivities,
          chemblMechanisms: FIXTURE_CORE_PANELS.chemblMechanisms,
          adverseEvents: FIXTURE_CORE_PANELS.adverseEvents,
          clinicalTrials: FIXTURE_CORE_PANELS.clinicalTrials,
          diseaseAssociations: FIXTURE_CORE_PANELS.diseaseAssociations,
        },
        {
          retrievedAt: FIXTURE_RETRIEVED_AT,
          moleculeName: 'Aspirin',
          totalCap: 12,
        },
      )
      expect(claims.length).toBeGreaterThan(0)
      expect(claims.every(c => c.provenance?.source && c.statement)).toBe(true)
    })

    it('returns empty for empty panels', () => {
      const claims = extractDecisionStripClaims(
        {},
        { retrievedAt: FIXTURE_RETRIEVED_AT, moleculeName: 'X' },
      )
      expect(claims).toEqual([])
    })

    it('corePanelInputFromMerged maps keys', () => {
      const bag = corePanelInputFromMerged({
        chemblActivities: [{ activityId: '1' }],
        clinicalTrials: null,
      })
      expect(bag.chemblActivities).toHaveLength(1)
      expect(bag.clinicalTrials).toBeNull()
    })
  })
})
