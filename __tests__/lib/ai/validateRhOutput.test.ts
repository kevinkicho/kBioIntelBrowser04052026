import { validateRhAiOutput } from '@/lib/ai/validateRhOutput'
import { minClaimsForRhMode, buildRhAiContext, rhModeSystemPrompt } from '@/lib/ai/rhContracts'
import type { EvidenceClaim } from '@/lib/domain'

const claims: EvidenceClaim[] = [
  {
    id: 'ec:a',
    claimType: 'mechanism',
    statement: 'Inhibits COX-1',
    epistemicStatus: 'supported',
    provenance: { source: 'ChEMBL', retrievedAt: '2026-04-07T12:00:00.000Z' },
  },
  {
    id: 'ec:b',
    claimType: 'safety',
    statement: 'GI bleed risk',
    epistemicStatus: 'supported',
    provenance: { source: 'OpenFDA', retrievedAt: '2026-04-07T12:00:00.000Z' },
  },
  {
    id: 'ec:c',
    claimType: 'trial',
    statement: 'Phase 3 study NCT1',
    epistemicStatus: 'supported',
    provenance: { source: 'ClinicalTrials.gov', retrievedAt: '2026-04-07T12:00:00.000Z' },
  },
]

describe('rhContracts', () => {
  it('min claims gates synthesis modes', () => {
    expect(minClaimsForRhMode('rh_thesis_draft')).toBe(3)
    expect(minClaimsForRhMode('rh_gap_map')).toBe(0)
    expect(minClaimsForRhMode('rh_custom')).toBe(0)
  })

  it('buildRhAiContext allowlists claim ids', () => {
    const ctx = buildRhAiContext({
      title: 'T',
      thesis: 'body',
      claims,
    })
    expect(ctx.claimIdAllowlist).toEqual(['ec:a', 'ec:b', 'ec:c'])
  })

  it('system prompt forbids efficacy language', () => {
    expect(rhModeSystemPrompt('rh_thesis_draft')).toMatch(/never say a drug/i)
  })
})

describe('validateRhAiOutput', () => {
  const allow = ['ec:a', 'ec:b', 'ec:c']

  it('accepts valid thesis JSON with sections', () => {
    const raw = JSON.stringify({
      summary: 'Aspirin warrants investigation for pain via COX.',
      claimIds: ['ec:a', 'ec:c'],
      sections: {
        workingClaim: 'Aspirin / COX / pain',
        killCriteria: ['GI bleed'],
        falsifiers: ['No target link'],
      },
    })
    const r = validateRhAiOutput(raw, allow, 'rh_thesis_draft')
    expect(r.ok).toBe(true)
    expect(r.refused).toBe(false)
    expect(r.insight?.sections?.workingClaim).toContain('Aspirin')
    expect(r.insight?.claimIds).toEqual(['ec:a', 'ec:c'])
  })

  it('strips orphan claim ids', () => {
    const raw = JSON.stringify({
      summary: 'Ok',
      claimIds: ['ec:a', 'ec:fake'],
    })
    const r = validateRhAiOutput(raw, allow, 'rh_lab_meeting')
    expect(r.insight?.claimIds).toEqual(['ec:a'])
    expect(r.errors.some((e) => e.startsWith('orphan_claim_ids'))).toBe(true)
  })

  it('refuses when pack under min claims', () => {
    const raw = JSON.stringify({ summary: 'Thin', claimIds: [] })
    const r = validateRhAiOutput(raw, ['ec:a'], 'rh_thesis_draft')
    expect(r.refused).toBe(true)
    expect(r.insight?.confidence).toBe('insufficient')
  })

  it('parses experiments with related claims', () => {
    const raw = JSON.stringify({
      summary: 'Plan',
      claimIds: ['ec:a'],
      experiments: [
        {
          description: 'CETSA on COX',
          priority: 'high',
          relatedClaimIds: ['ec:a', 'ec:nope'],
          costTier: 'low',
          successCriteria: 'Thermal shift',
        },
      ],
    })
    const r = validateRhAiOutput(raw, allow, 'rh_next_experiments')
    expect(r.insight?.experiments?.[0].relatedClaimIds).toEqual(['ec:a'])
    expect(r.insight?.experiments?.[0].successCriteria).toBe('Thermal shift')
  })

  it('parses rivals and gaps', () => {
    const raw = JSON.stringify({
      summary: 'Compare',
      claimIds: ['ec:b'],
      rivals: [
        { role: 'primary', title: 'On-target', thesis: 'COX' },
        { role: 'null', title: 'Insufficient', thesis: 'Too thin' },
      ],
      gaps: [{ facet: 'literature', message: 'No lit', suggestedAction: 'EuropePMC' }],
      overclaims: ['Says cures disease'],
    })
    const r = validateRhAiOutput(raw, allow, 'rh_rival_hypotheses')
    expect(r.insight?.rivals).toHaveLength(2)
    expect(r.insight?.gaps?.[0].facet).toBe('literature')
    expect(r.insight?.overclaims?.[0]).toMatch(/cures/)
  })

  it('rejects invalid json', () => {
    const r = validateRhAiOutput('not json', allow, 'rh_thesis_draft')
    expect(r.ok).toBe(false)
    expect(r.refused).toBe(true)
  })
})
