import { planEvidenceOrchestration } from '@/lib/evidence/evidenceOrchestration'
import { summarizePackHonesty } from '@/lib/evidence/packHonesty'
import type { EvidenceClaim } from '@/lib/domain'

describe('evidenceOrchestration', () => {
  it('plans shortlist steps that raise finish rate', () => {
    const plan = planEvidenceOrchestration('shortlist', {
      diseaseQuery: 'ATTR amyloidosis',
      targets: ['TTR'],
    })
    expect(plan.steps.length).toBeGreaterThanOrEqual(3)
    expect(plan.steps[0]!.href).toContain('discover')
    expect(plan.lawReminders.some((l) => /Free public/i.test(l))).toBe(true)
  })

  it('plans rare and pack goals', () => {
    expect(planEvidenceOrchestration('rare').steps.length).toBeGreaterThan(1)
    expect(planEvidenceOrchestration('pack').steps.some((s) => /pack|RH|Promote/i.test(s.title))).toBe(
      true,
    )
  })
})

describe('packHonesty', () => {
  it('flags sparse packs below soft M3', () => {
    const claims = [
      {
        id: 'c1',
        statement: 'Short',
        claimType: 'mechanism',
        subjectCandidateId: 'cid:1',
        epistemicStatus: 'asserted',
        provenance: { source: 'ChEMBL', retrievedAt: '2026-01-01T00:00:00.000Z' },
      },
    ] as unknown as EvidenceClaim[]
    const h = summarizePackHonesty(claims, { minCitable: 5 })
    expect(h.claimCount).toBe(1)
    expect(h.warnings.some((w) => /M3|citable/i.test(w))).toBe(true)
    expect(h.honestyLines.length).toBeGreaterThan(1)
  })

  it('surfaces not-retrieved rows', () => {
    const claims = [
      {
        id: 'c2',
        statement: 'FAERS not retrieved (timeout)',
        claimType: 'safety',
        subjectCandidateId: 'cid:1',
        epistemicStatus: 'unknown',
        provenance: { source: 'openFDA FAERS', retrievedAt: '2026-01-01T00:00:00.000Z' },
      },
    ] as unknown as EvidenceClaim[]
    const h = summarizePackHonesty(claims)
    expect(h.emptyOrMissingSources).toContain('openFDA FAERS')
  })
})
