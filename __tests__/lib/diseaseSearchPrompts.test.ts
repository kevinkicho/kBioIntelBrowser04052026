import {
  buildDiseaseSearchBriefPrompt,
  buildDiseaseSearchGapPrompt,
  buildDiseaseSearchRepurposingPrompt,
  buildDiseaseSearchMechanismPrompt,
  buildDiseaseSearchHypothesisPrompt,
} from '@/lib/ai/promptTemplates'

const SAMPLE_CONTEXT = `=== DISEASE SEARCH: "diabetes" ===
Results: 3 diseases from Open Targets, DisGeNET
Candidate molecules found: 4 across 2 diseases

## Type 2 Diabetes [Open Targets]
  Therapeutic areas: metabolic, endocrine
  Candidate molecules:
    - Metformin (CID 4091) — CLICKABLE
    - Insulin (CID 11888) — CLICKABLE

## Diabetic Neuropathy [DisGeNET]
  Therapeutic areas: neurology, metabolic

## Hypertension [Open Targets]
  Therapeutic areas: cardiovascular, metabolic
  Candidate molecules:
    - Lisinopril (CID 5362119) — CLICKABLE
    - Metformin (CID 4091) — CLICKABLE

// RESEARCHER GUIDANCE:
- Cross-reference therapeutic areas to find unexpected drug repurposing opportunities`

const EMPTY_CONTEXT = `=== DISEASE SEARCH: "obscure" ===
Results: 0 diseases from 
Candidate molecules found: 0 across 0 diseases`

describe('disease search prompts', () => {
  describe('buildDiseaseSearchBriefPrompt', () => {
    it('returns system + user with non-empty content', () => {
      const result = buildDiseaseSearchBriefPrompt(SAMPLE_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })

    it('includes disease search data in user message', () => {
      const result = buildDiseaseSearchBriefPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('Type 2 Diabetes')
      expect(result.user).toContain('Hypertension')
    })

    it('includes executive brief structure', () => {
      const result = buildDiseaseSearchBriefPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('LANDSCAPE OVERVIEW')
      expect(result.user).toContain('KEY ASSETS')
      expect(result.user).toContain('STRATEGIC GAPS')
      expect(result.user).toContain('NEXT QUERY')
    })

    it('uses BioIntel system prompt', () => {
      const result = buildDiseaseSearchBriefPrompt(SAMPLE_CONTEXT)
      expect(result.system).toContain('BioIntel Copilot')
    })

    it('handles empty context', () => {
      const result = buildDiseaseSearchBriefPrompt(EMPTY_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })
  })

  describe('buildDiseaseSearchGapPrompt', () => {
    it('returns system + user with gap-analysis structure', () => {
      const result = buildDiseaseSearchGapPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('DISEASES WITHOUT MOLECULES')
      expect(result.user).toContain('THERAPEUTIC AREAS WITHOUT CANDIDATES')
    })

    it('includes disease search data', () => {
      const result = buildDiseaseSearchGapPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain(SAMPLE_CONTEXT)
    })

    it('handles empty context', () => {
      const result = buildDiseaseSearchGapPrompt(EMPTY_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })
  })

  describe('buildDiseaseSearchRepurposingPrompt', () => {
    it('returns system + user with repurposing structure', () => {
      const result = buildDiseaseSearchRepurposingPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('SHARED MOLECULES')
      expect(result.user).toContain('BIOLOGICAL RATIONALE')
      expect(result.user).toContain('EVIDENCE STRENGTH')
    })

    it('includes disease search data', () => {
      const result = buildDiseaseSearchRepurposingPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('Metformin')
    })

    it('handles empty context', () => {
      const result = buildDiseaseSearchRepurposingPrompt(EMPTY_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })
  })

  describe('buildDiseaseSearchMechanismPrompt', () => {
    it('returns system + user with mechanism structure', () => {
      const result = buildDiseaseSearchMechanismPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('CONVERGENT PATHWAYS')
      expect(result.user).toContain('DIVERGENT MECHANISMS')
      expect(result.user).toContain('MOLECULE-TO-MECHANISM')
    })

    it('includes disease search data', () => {
      const result = buildDiseaseSearchMechanismPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain(SAMPLE_CONTEXT)
    })

    it('handles empty context', () => {
      const result = buildDiseaseSearchMechanismPrompt(EMPTY_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })
  })

  describe('buildDiseaseSearchHypothesisPrompt', () => {
    it('returns system + user with hypothesis structure', () => {
      const result = buildDiseaseSearchHypothesisPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('HYPOTHESIS')
      expect(result.user).toContain('FALSIFICATION')
      expect(result.user).toContain('NOVELTY')
    })

    it('includes disease search data', () => {
      const result = buildDiseaseSearchHypothesisPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain(SAMPLE_CONTEXT)
    })

    it('handles empty context', () => {
      const result = buildDiseaseSearchHypothesisPrompt(EMPTY_CONTEXT)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })

    it('emphasizes falsifiability', () => {
      const result = buildDiseaseSearchHypothesisPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('falsifiable')
    })
  })

  describe('prompt differentiation', () => {
    it('each prompt produces distinct user content', () => {
      const brief = buildDiseaseSearchBriefPrompt(SAMPLE_CONTEXT).user
      const gap = buildDiseaseSearchGapPrompt(SAMPLE_CONTEXT).user
      const repurposing = buildDiseaseSearchRepurposingPrompt(SAMPLE_CONTEXT).user
      const mechanism = buildDiseaseSearchMechanismPrompt(SAMPLE_CONTEXT).user
      const hypothesis = buildDiseaseSearchHypothesisPrompt(SAMPLE_CONTEXT).user

      const prompts = [brief, gap, repurposing, mechanism, hypothesis]
      for (let i = 0; i < prompts.length; i++) {
        for (let j = i + 1; j < prompts.length; j++) {
          expect(prompts[i]).not.toEqual(prompts[j])
        }
      }
    })

    it('repurposing prompt focuses on molecules across diseases', () => {
      const result = buildDiseaseSearchRepurposingPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('MORE THAN ONE disease')
    })

    it('mechanism prompt focuses on pathways', () => {
      const result = buildDiseaseSearchMechanismPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('CROSS-DISEASE')
      expect(result.user).toContain('CONVERGENT PATHWAYS')
    })

    it('hypothesis prompt emphasizes novelty and falsifiability', () => {
      const result = buildDiseaseSearchHypothesisPrompt(SAMPLE_CONTEXT)
      expect(result.user).toContain('speculative')
      expect(result.user).toContain('DISPROVE')
    })
  })
})