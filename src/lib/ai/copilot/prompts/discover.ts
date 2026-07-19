import { SYSTEM_PROMPT } from './shared'

export function buildCandidateComparePrompt(
  disease: string,
  candidateA: { name: string; cid: number; compositeScore: number; confidence: string; trials: number; targets: number; indications: number; data: Record<string, unknown> },
  candidateB: { name: string; cid: number; compositeScore: number; confidence: string; trials: number; targets: number; indications: number; data: Record<string, unknown> },
): { system: string; user: string } {
  const extractArr = (data: Record<string, unknown>, key: string): unknown[] => {
    const val = data[key]
    return Array.isArray(val) ? val : []
  }

  const mechanismsA = extractArr(candidateA.data, 'chemblMechanisms')
  const mechanismsB = extractArr(candidateB.data, 'chemblMechanisms')
  const mechStrA = mechanismsA.slice(0, 5).map((m: unknown) => {
    const mm = m as Record<string, unknown>
    return `${mm.mechanismOfAction ?? '?'} → ${mm.targetName ?? '?'} (${mm.actionType ?? '?'})`
  }).join('; ') || 'No MoA data'
  const mechStrB = mechanismsB.slice(0, 5).map((m: unknown) => {
    const mm = m as Record<string, unknown>
    return `${mm.mechanismOfAction ?? '?'} → ${mm.targetName ?? '?'} (${mm.actionType ?? '?'})`
  }).join('; ') || 'No MoA data'

  const adverseA = extractArr(candidateA.data, 'adverseEvents')
  const adverseB = extractArr(candidateB.data, 'adverseEvents')
  const aeStrA = adverseA.slice(0, 5).map((ae: unknown) => {
    const a = ae as Record<string, unknown>
    return `${a.reactionName ?? '?'} (${a.count ?? '?'} reports${a.serious ? ', serious' : ''})`
  }).join('; ') || 'No AE data'
  const aeStrB = adverseB.slice(0, 5).map((ae: unknown) => {
    const a = ae as Record<string, unknown>
    return `${a.reactionName ?? '?'} (${a.count ?? '?'} reports${a.serious ? ', serious' : ''})`
  }).join('; ') || 'No AE data'

  const trialsA = extractArr(candidateA.data, 'clinicalTrials')
  const trialsB = extractArr(candidateB.data, 'clinicalTrials')
  const phaseStrA = (() => {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0
    for (const t of trialsA) {
      const ph = String((t as Record<string, unknown>).phase ?? '').toLowerCase()
      if (ph.includes('phase 4')) p4++
      else if (ph.includes('phase 3')) p3++
      else if (ph.includes('phase 2')) p2++
      else if (ph.includes('phase 1')) p1++
    }
    return `Phase 1: ${p1}, Phase 2: ${p2}, Phase 3: ${p3}, Phase 4: ${p4}`
  })()
  const phaseStrB = (() => {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0
    for (const t of trialsB) {
      const ph = String((t as Record<string, unknown>).phase ?? '').toLowerCase()
      if (ph.includes('phase 4')) p4++
      else if (ph.includes('phase 3')) p3++
      else if (ph.includes('phase 2')) p2++
      else if (ph.includes('phase 1')) p1++
    }
    return `Phase 1: ${p1}, Phase 2: ${p2}, Phase 3: ${p3}, Phase 4: ${p4}`
  })()

  const user = `Disease: ${disease}

You are comparing two candidate molecules for treating ${disease}. Based on the ranking data and molecule profiles, determine which is MORE PROMISING for ${disease} and explain why.

CANDIDATE A: ${candidateA.name} (CID ${candidateA.cid})
- Composite Score: ${(candidateA.compositeScore * 100).toFixed(0)}% | Confidence: ${candidateA.confidence}
- Clinical Trials: ${candidateA.trials} trials (${phaseStrA})
- Protein Targets: ${candidateA.targets}
- Indications: ${candidateA.indications}
- Mechanisms: ${mechStrA}
- Top Adverse Events: ${aeStrA}

CANDIDATE B: ${candidateB.name} (CID ${candidateB.cid})
- Composite Score: ${(candidateB.compositeScore * 100).toFixed(0)}% | Confidence: ${candidateB.confidence}
- Clinical Trials: ${candidateB.trials} trials (${phaseStrB})
- Protein Targets: ${candidateB.targets}
- Indications: ${candidateB.indications}
- Mechanisms: ${mechStrB}
- Top Adverse Events: ${aeStrB}

Provide your analysis in 4-6 sentences:
1. VERDICT: Which candidate is MORE promising for ${disease} and why? (Consider: clinical maturity, target relevance, safety profile, and overall evidence strength)
2. KEY ADVANTAGE: What is the single biggest advantage of the winner over the runner-up for THIS disease specifically?
3. KEY RISK: What is the biggest concern or caveat about your verdict?
4. CAVEAT: Under what circumstances might the runner-up actually be preferred? (e.g., patient subpopulation, combination therapy, safety-first approach)

Be specific — cite scores, trial counts, target names, and AE patterns. Think like a drug development scientist making a portfolio decision.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiscoverRationalePrompt(
  diseaseName: string,
  candidate: { name: string; compositeScore: number; clinicalPhase: number; clinicalPhaseRaw: number; geneAssociationScore: number; sharedTargetRatio: number; sharedTargetCountRaw: number; trialCountNorm: number; trialCountRaw: number; sources: string[]; confidence: string },
  topCandidates: { name: string; compositeScore: number; clinicalPhaseRaw: number; trialCountRaw: number }[],
  diseaseGenes?: { symbol: string; score: number }[],
): { system: string; user: string } {
  const phaseLabels: Record<number, string> = { 0: 'Preclinical', 1: 'Phase I', 2: 'Phase II', 3: 'Phase III', 4: 'Approved (Phase IV)' }
  const phase = phaseLabels[candidate.clinicalPhaseRaw] ?? `Phase ${candidate.clinicalPhaseRaw}`

  const comparisons = topCandidates
    .filter(c => c.name !== candidate.name)
    .slice(0, 4)
    .map(c => `  - ${c.name}: score ${c.compositeScore.toFixed(2)}, ${phaseLabels[c.clinicalPhaseRaw] ?? `Phase ${c.clinicalPhaseRaw}`}, ${c.trialCountRaw} trials`)
    .join('\n')

  const geneLines = diseaseGenes && diseaseGenes.length > 0
    ? diseaseGenes
        .slice(0, 8)
        .map(g => `  - ${g.symbol} (association score: ${g.score.toFixed(2)})`)
        .join('\n')
    : '  (gene data unavailable)'

  const user = `Disease: ${diseaseName}

You are analyzing why "${candidate.name}" is ranked as a top candidate for ${diseaseName}. Here is its ranking data:

**Composite Score: ${candidate.compositeScore.toFixed(2)}** (out of 1.0)
- Clinical Phase: ${phase} (score: ${candidate.clinicalPhase.toFixed(2)})
- Gene Association Score: ${candidate.geneAssociationScore.toFixed(2)} (how strongly its targets are linked to ${diseaseName})
- Target Match: ${candidate.sharedTargetRatio.toFixed(2)} (hits ${candidate.sharedTargetCountRaw} disease-relevant gene targets)
- Trial Volume: ${candidate.trialCountNorm.toFixed(2)} (${candidate.trialCountRaw} clinical trials)
- Confidence: ${candidate.confidence} (${candidate.sources.length} independent sources: ${candidate.sources.join(', ')})

Key disease-associated genes for ${diseaseName}:
${geneLines}

Other top candidates for comparison:
${comparisons || '  (no other candidates)'}

Explain in 3-5 sentences WHY this molecule is ranked this highly for ${diseaseName}. Focus on:
1. What its strongest signal is and what that means scientifically — if its targets overlap with the disease genes listed above, name them
2. How its ranking compares to alternatives — what trade-offs does it represent?
3. Any caveats or limitations in the data that the researcher should know about

Be specific. Use the exact scores, gene names, and data above. Think like a drug discovery researcher, not a data reporter.`

  return { system: SYSTEM_PROMPT, user }
}
