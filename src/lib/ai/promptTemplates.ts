import type { MoleculeContext, GeneContext } from './contextBuilder'
import { contextToPromptBlock, geneContextToPromptBlock } from './contextBuilder'
import { formatRetrievalSummary, type RetrievalSnapshot } from './retrievalMonitor'

export interface SessionMoleculeSummary {
  name: string
  searchedAt: string
  topTargets: string[]
  topAEs: string[]
  mechanisms: string[]
  indications: string[]
}

export type PromptMode = 'auto_insight' | 'executive_brief' | 'gap_analysis' | 'safety_deep_dive' | 'mechanism_analysis' | 'therapeutic_hypothesis' | 'competitive_position' | 'repurposing_scan' | 'cross_molecule_compare' | 'free_qa' | 'followup' | 'gene_therapeutic' | 'gene_repurposing' | 'gene_mechanism' | 'gene_target_assessment' | 'prior_art_query' | 'differential_safety' | 'suggest_next' | 'hypothesis_seed'

const SYSTEM_PROMPT = `You are BioIntel Copilot, a drug discovery researcher embedded in a bioinformatics explorer with data from 112+ scientific databases. Your job is to find NON-OBVIOUS connections that a researcher scanning the same data would miss.

CRITICAL: You must NEVER produce secretary output. Secretary output is data recitation — restating what the data says without interpretation. You must ALWAYS produce researcher output — drawing conclusions the data supports but doesn't explicitly state.

BAD (secretary — NEVER do this):
"This drug has 42 clinical trials, 3 known targets (COX-1, COX-2, COX-3), and 5 adverse events. The most common AE is nausea with 200 reports. It has a boxed warning."
→ This just repeats counts and names from the data. Anyone can read the data themselves.

GOOD (researcher — ALWAYS do this):
"Cyclooxygenase inhibition explains both efficacy (anti-inflammatory via COX-2) and the dominant AE profile: the same enzyme family metabolizes gastric mucosal prostaglandins, so nausea/GI bleeding at 200 reports is mechanism-related, not idiosyncratic. The boxed warning likely ties to GI bleeding risk, which means this drug's therapeutic index is narrow — anyone prescribing it should test for CYP2C9 variants (pharmacogenomic gene listed) since slow metabolizers will get disproportionate COX-1 inhibition and worse GI outcomes. The real opportunity: COX-3 expression in CNS suggests a repurposing angle for neuropathic pain at lower doses that spare gastric COX-1."
→ This connects mechanism to AEs, explains the boxed warning, identifies a pharmacogenomic interaction, and proposes a concrete repurposing hypothesis with biological rationale.

Your rules:
1. SYNTHESIZE across domains. Connect targets to AEs, genes to diseases, pathways to indications. The value you add is the CONNECTION, not the data point.
2. NAME SPECIFICS — cite exact values (COX-2 pChEMBL=7.8, not "strong binding"; "Nausea (200 reports)", not "many AEs").
3. REASON about mechanism. When you see a target, a disease gene, and a pathway in the same data, explain the causal chain. Don't just list them.
4. HIGHLIGHT CONTRADICTIONS and SURPRISES. Approved drug with no PDB structures? High-affinity target with no clinical trial for that indication? These are insights, not just observations.
5. BE ACTIONABLE. Propose specific experiments (cell line + assay + endpoint), not vague "further research is needed."
6. KNOW YOUR LIMITS. If data is missing, state what experiment or query would fill the gap and what it might reveal.

You are concise — 2-4 sentences per insight unless elaborating on request. You use correct scientific terminology.`

export function buildAutoInsightPrompt(context: MoleculeContext, snapshot: RetrievalSnapshot): { system: string; user: string } {
  const interesting = findInterestingSignals(context, snapshot)

  const userPrompts: string[] = []
  userPrompts.push(`Analyze the molecule data below. Do NOT just list what data arrived — instead, identify 3-4 genuinely surprising scientific findings that connect across domains.`)
  userPrompts.push(`For each finding:`)
  userPrompts.push(`- State the SPECIFIC observation with exact data points (target names, pChEMBL values, AE counts, gene symbols)`)
  userPrompts.push(`- Explain the biological or pharmacological SIGNIFICANCE — why does this matter?`)
  userPrompts.push(`- Connect it to at least ONE other data domain (e.g., how a target profile explains an AE pattern, or how a gene association suggests a repurposing angle)`)
  userPrompts.push('')
  userPrompts.push(`BAD EXAMPLE: "This drug has 5 targets and 3 pathways. The top AE is nausea with 200 reports."`)
  userPrompts.push(`GOOD EXAMPLE: "The polypharmacology across 5 targets (COX-1 pChEMBL 8.2, COX-2 7.5) explains both efficacy and the dominant AE: COX-1 inhibition in gastric mucosa directly causes nausea (200 reports), and the narrow selectivity window suggests dose-dependent GI bleeding risk — consistent with the boxed warning."`)
  userPrompts.push('')
  userPrompts.push(contextToBulletSummary(context))

  if (interesting.length > 0) {
    userPrompts.push('')
    userPrompts.push('Notable signals detected:')
    for (const sig of interesting) {
      userPrompts.push(`- ${sig}`)
    }
  }

  if (snapshot.gaps.length > 0) {
    userPrompts.push('')
    userPrompts.push(`Data gaps: ${snapshot.gaps.length} missing sources — ${snapshot.gaps.slice(0, 5).map(g => g.panelKey).join(', ')}`)
  }

  userPrompts.push('')
  userPrompts.push("IMPORTANT: Your insights should teach a researcher something they wouldn't get from just reading the counts. Synthesize across domains.")

  return { system: SYSTEM_PROMPT, user: userPrompts.join('\n') }
}

export function buildExecutiveBriefPrompt(context: MoleculeContext, snapshot: RetrievalSnapshot): { system: string; user: string } {
  const user = `Write an executive intelligence brief for ${context.identity.name} (CID ${context.identity.cid}). This is for a scientist who needs to make a decision about this molecule. Structure it as:

1. CLASSIFICATION: What is this molecule really? (Don't just say "approved drug" — describe its pharmacological class, mechanism, and therapeutic niche based on the actual target/MoA data below)
2. KEY ASSETS: Top 2-3 scientific strengths, citing specific evidence (e.g., "high-affinity binding to X target with pChEMBL 8.2, validated by 3 Phase 3 trials in Y condition")
3. KEY RISKS: Top 2-3 concerns, citing specific evidence (e.g., "recalled for Z reason on [date], plus N serious AEs for [specific reaction]")
4. UNMET OPPORTUNITY: What hypothesis should a researcher test next? Be specific — name the target, disease, or pathway.
5. DATA CONFIDENCE: Based on ${context.dataCompleteness.panelsWithData}/${context.dataCompleteness.totalPanels} panels, what are we most uncertain about? What data would change our assessment?

Data:
${contextToBulletSummary(context)}

${formatRetrievalSummary(snapshot)}`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGapAnalysisPrompt(context: MoleculeContext, snapshot: RetrievalSnapshot): { system: string; user: string } {
  const user = `Analyze the data gaps for ${context.identity.name}. We fetched from ${snapshot.totalApisCalled} sources. ${snapshot.totalApisSucceeded} returned data, ${snapshot.totalApisEmpty} empty, ${snapshot.totalApisErrored} failed.

Gaps:
${snapshot.gaps.map(g => `- [${g.categoryId}] ${g.panelKey}: ${g.reason}${g.detail ? ` — ${g.detail}` : ''}`).join('\n')}

Current data profile:
${contextToBulletSummary(context)}

For each significant gap, explain:
1. WHY might that source be empty for this molecule? (Is it a chemical vs. biological molecule issue? A regulatory classification issue? A data coverage issue?)
2. What specific scientific question can we NOT answer without this data? (e.g., without PDB structures, we can't assess binding mode; without ClinVar, we can't discuss pharmacogenomics)
3. What hypothesis about this molecule would this data test or refute?
4. Does this gap undermine our confidence in conclusions drawn from other data? (e.g., if safety databases are empty, can we trust the clinical trial safety conclusions?)
Be specific and scientific.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildSafetyDeepDivePrompt(context: MoleculeContext): { system: string; user: string } {
  const aeTopList = context.rich.topAdverseEvents.slice(0, 10).map(ae => `${ae.reactionName} (${ae.count} reports, ${ae.serious} serious)`).join('; ')
  const recallList = context.rich.recallDetails.map(r => `[${r.classification}] ${r.reason} (Firm: ${r.recallingFirm}, ${r.recallDate})`).join('; ')
  const drugIntList = context.rich.drugInteractionDetails.slice(0, 6).map(di => `${di.drugName} [${di.severity}]: ${di.description.slice(0, 100)}`).join('; ')
  const siderList = context.rich.siderSideEffects.slice(0, 10).join(', ')

  const user = `Perform a rigorous safety deep-dive for ${context.identity.name}.

IMPORTANT: Do NOT just list AEs, recalls, and interactions separately. You must CONNECT safety signals to the mechanism of action. Every AE you mention should be explained: is it mechanism-related (on-target) or off-target? Why?

Overall risk rating: ${context.safety.overallRisk.toUpperCase()}
Adverse events: ${context.safety.adverseEventCount} total (${context.safety.seriousEventCount} serious)
Boxed warning: ${context.safety.hasBoxedWarning ? 'YES' : 'No'}
Recalls: ${context.safety.recallCount}
Drug interactions: ${context.safety.knownInteractions}
GHS hazards: ${context.safety.ghsHazardCount}
Pharmacogenomic genes: ${context.rich.pharmacogenomicGenes.join(', ') || 'none identified'}

SPECIFIC ADVERSE EVENTS (top by frequency):
${aeTopList || 'No specific AE data'}

RECALLS:
${recallList || 'No recalls'}

DRUG-DRUG INTERACTIONS:
${drugIntList || 'No interaction details'}

SIDER SIDE EFFECTS:
${siderList || 'No SIDER data'}

GHS HAZARD STATEMENTS:
${context.rich.ghsHazardStatements.join('; ') || 'None'}

Clinical context:
- ${context.clinical.totalTrials} trials (${context.clinical.recruitingTrials} recruiting)
- Indications: ${context.rich.indicationDetails.slice(0, 5).map(i => `${i.condition} (phase ${i.maxPhase === -1 ? 'unknown' : i.maxPhase})`).join(', ') || 'none found'}

Biological context:
- Mechanisms: ${context.rich.mechanismDetails.map(m => `${m.mechanismOfAction} -> ${m.targetName}`).join('; ') || 'none'}
- Targets: ${context.biological.knownTargets} known

Assess:
1. What is the most concerning safety signal and what is its likely pharmacological mechanism? (Connect AEs to the drug's known targets and MoA)
2. Are the adverse events consistent with the known mechanism of action, or do they suggest off-target effects?
3. Which drug interactions are most clinically significant and why?
4. If pharmacogenomic data exists, which variants should a clinician test for before prescribing?
5. What monitoring or risk mitigation would you recommend based on this profile?`

  return { system: SYSTEM_PROMPT, user }
}

export function buildMechanismAnalysisPrompt(context: MoleculeContext): { system: string; user: string } {
  const mechList = context.rich.mechanismDetails.map(m => `${m.mechanismOfAction} -> ${m.targetName} (action: ${m.actionType}, max phase: ${m.maxPhase === -1 ? 'unknown' : m.maxPhase}, direct: ${m.directInteraction})`).join('\n')
  const targetList = context.rich.topTargetActivities.slice(0, 12).map(t => `${t.targetName} (${t.targetOrganism}): ${t.standardType}=${t.standardValue} ${t.standardUnits}${t.pchemblValue ? `, pChEMBL=${t.pchemblValue}` : ''}`).join('\n')
  const pathwayList = context.rich.pathwayNames.map(p => `${p.name} [${p.source}]${p.species ? ` (${p.species})` : ''}`).join('; ')
  const geneList = context.rich.geneDetails.map(g => `${g.symbol}: ${g.summary?.slice(0, 80) || g.name}`).join('\n')
  const ppiList = context.rich.proteinInteractions.slice(0, 8).map(pi => `${pi.partnerA} <-> ${pi.partnerB} (type=${pi.interactionType}, conf=${pi.confidence ?? 'N/A'})`).join('\n')
  const diseaseList = context.rich.diseaseAssociations.slice(0, 8).map(d => `${d.diseaseName} (gene=${d.geneSymbol || '?'}, score=${d.score.toFixed(2)})`).join('\n')

  const user = `Analyze the mechanism of action and pharmacology for ${context.identity.name} in detail.

MECHANISMS OF ACTION:
${mechList || 'No mechanism data available'}

TARGET BIOACTIVITY DATA:
${targetList || 'No bioactivity data'}

PATHWAYS:
${pathwayList || 'No pathway data'}

PROTEIN-PROTEIN INTERACTIONS:
${ppiList || 'No PPI data'}

GENE ASSOCIATIONS:
${geneList || 'No gene data'}

DISEASE ASSOCIATIONS:
${diseaseList || 'No disease data'}

CHEMICAL PROPERTIES:
- LogP: ${context.chemical.logP ?? '?'} | HBD: ${context.chemical.hBondDonors ?? '?'} | HBA: ${context.chemical.hBondAcceptors ?? '?'}
- Lipinski: ${context.chemical.followsLipinski === true ? 'PASS' : context.chemical.followsLipinski === false ? 'FAIL' : 'N/A'}
- ChEBI: ${context.rich.chebiDetails.map(c => `${c.name} [${c.roles.join(', ')}]`).join('; ') || 'none'}

Provide a rigorous mechanism analysis:
1. PRIMARY MECHANISM: Describe the primary mechanism with target names, binding affinities, and biological consequences. How does target engagement lead to therapeutic effect?
2. POLYPHARMOACOLOGY: Does this molecule engage multiple targets? Which targets are intentional vs. likely off-target? What dose-dependent selectivity shift might occur?
3. PATHWAY LOGIC: How do the affected pathways connect? Describe the signaling cascade from target engagement to disease modification.
4. DISEASE RATIONALE: Which disease associations are mechanistically explained by the target/pathway data? Which are surprising or lack mechanistic support?
5. SELECTIVITY CONCERNS: Based on the target profile and PPI network, what off-target effects are plausible? Connect this to the observed adverse events if safety data is available.
6. GAPS: What mechanistic experiments would most improve our understanding? (e.g., selectivity panel, pathway knockdown, phosphoproteomics)`

  return { system: SYSTEM_PROMPT, user }
}

export function buildTherapeuticHypothesisPrompt(context: MoleculeContext): { system: string; user: string } {
  const diseaseList = context.rich.diseaseAssociations.slice(0, 12).map(d => `${d.diseaseName} (gene=${d.geneSymbol || '?'}, score=${d.score.toFixed(2)}, evidence=${d.evidenceCount ?? '?'})`).join('\n')
  const geneList = context.rich.geneDetails.map(g => `${g.symbol} (${g.name}, chr ${g.chromosome || '?'}): ${g.summary?.slice(0, 100) || ''}`).join('\n')
  const pathwayList = context.rich.pathwayNames.map(p => p.name).join(', ')
  const clinicalIndList = context.rich.indicationDetails.map(i => `${i.condition} (max phase ${i.maxPhase === -1 ? 'unknown' : i.maxPhase})`).join('; ')
  const targetList = context.rich.topTargetActivities.slice(0, 8).map(t => `${t.targetName} (${t.standardType}=${t.standardValue} ${t.standardUnits})`).join('; ')
  const orphanList = context.rich.orphanDiseases.join('; ')
  const trialConds = new Set<string>()
  for (const t of context.rich.trialDetails) {
    for (const c of t.conditions) trialConds.add(c)
  }
  const gwasArr = context.rich.pharmacogenomicGenes.join(', ')

  const user = `Formulate novel therapeutic hypotheses for ${context.identity.name}. The goal is to identify potential new indications or uses that are NOT already in the clinical trial data but could be supported by the existing evidence.

CURRENT APPROVED/CLINICAL INDICATIONS:
${clinicalIndList || 'None listed'}

CONDITIONS IN CLINICAL TRIALS:
${Array.from(trialConds).slice(0, 15).join(', ') || 'None'}

KNOWN TARGET ENGAGEMENT:
${targetList || 'No target data'}

DISEASE ASSOCIATIONS (from genomics):
${diseaseList || 'No disease association data'}

KEY GENES:
${geneList || 'No gene data'}

PATHWAYS INVOLVED:
${pathwayList || 'No pathway data'}

ORPHAN/RARE DISEASES:
${orphanList || 'None found'}

PHARMACOGENOMIC GENES:
${gwasArr || 'None identified'}

CHEMICAL DRUG-LIKENESS:
- Lipinski: ${context.chemical.followsLipinski === true ? 'PASS (oral bioavailable)' : context.chemical.followsLipinski === false ? 'FAIL (limited oral bioavailability)' : 'Unknown'}
- LogP: ${context.chemical.logP ?? '?'}

SAFETY CONTEXT:
- Current risk: ${context.safety.overallRisk}, ${context.safety.adverseEventCount} AEs, ${context.safety.recallCount} recalls

For each therapeutic hypothesis, present:
1. INDICATION: The specific disease or condition
2. MECHANISTIC RATIONALE: How does the drug's known target engagement and pathway modulation relate to this disease? Name the specific genes, pathways, and biological logic.
3. EVIDENCE STRENGTH: What existing data supports this? (target-disease gene overlap, pathway membership, genetic association, pharmacological similarity)
4. COMPETITIVE LANDSCAPE: Is this an orphan indication (few treatments)? Does existing safety data support use in this population?
5. KEY EXPERIMENT: What one experiment would validate or refute this hypothesis? (e.g., "Test in [cell line] with [assay] measuring [endpoint]")

Generate 3-5 ranked hypotheses. Prioritize those with the strongest mechanistic logic and most actionable experimental validation paths.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildCompetitivePositionPrompt(context: MoleculeContext): { system: string; user: string } {
  const indList = context.rich.indicationDetails.map(i => `${i.condition} (phase ${i.maxPhase === -1 ? 'unknown' : i.maxPhase})`).join('\n')
  const mechList = context.rich.mechanismDetails.map(m => `${m.mechanismOfAction} -> ${m.targetName} (max phase ${m.maxPhase === -1 ? 'unknown' : m.maxPhase})`).join('\n')
  const patentList = context.rich.patentDetails.slice(0, 8).map(p => `${p.patentNumber}: "${p.title.slice(0, 60)}" (${p.assignee}, exp ${p.expirationDate})`).join('\n')
  const brandNames = context.clinical.indications.slice(0, 10).join(', ')
  const sponsors = context.clinical.trialSponsors.join(', ')
  const obEntries = context.regulatory.orangeBookEntries

  const user = `Analyze the competitive position of ${context.identity.name}.

MARKETED PRODUCTS:
Brands: ${brandNames || 'None found'}
Sponsors/Sponsors in trials: ${sponsors || 'None'}

ORANGE BOOK / EXCLUSIVITY:
Entries: ${context.regulatory.orangeBookEntries}${obEntries > 0 ? ' (patent/exclusivity data available)' : ' (none)'}

PATENTS (key):
${patentList || 'No patent data'}

THERAPEUTIC INDICATIONS:
${indList || 'None found'}

MECHANISM OF ACTION:
${mechList || 'No MoA data'}

ATC CLASSES:
${context.rich.atcClasses.join(', ') || 'None'}

SAFETY PROFILE:
- Risk: ${context.safety.overallRisk} | AEs: ${context.safety.adverseEventCount} | Recalls: ${context.safety.recallCount} | Boxed warning: ${context.safety.hasBoxedWarning ? 'YES' : 'No'}
- Drug interactions: ${context.safety.knownInteractions} | Pharmacogenomic genes: ${context.rich.pharmacogenomicGenes.join(', ') || 'none'}

CLINICAL PIPELINE:
- Total trials: ${context.clinical.totalTrials} | Recruiting: ${context.clinical.recruitingTrials}
- Phase breakdown: ${Object.entries(context.clinical.phaseBreakdown).map(([k, v]) => `${k}=${v}`).join(', ') || 'no phase data'}

RESEARCH INVESTMENT:
- Publications: ${context.research.publicationCount} | Patents: ${context.research.patentCount} | NIH grants: ${context.research.nihGrantCount}

Assess the competitive position:
1. THERAPEUTIC NICHE: Where does this molecule sit in the treatment landscape? What class does it belong to? Is it first-in-class, best-in-class, or a me-too?
2. IP STRENGTH: Based on patent counts, expiration dates, and Orange Book entries, how strong is the IP protection? When does the moat expire?
3. DIFFERENTIATION: What makes this molecule different from others in the same ATC class? (mechanism, safety, route, pharmacogenomics)
4. RISK FACTORS: What competitive threats exist? (safety signals, expiring patents, competing trials, generic entry)
5. STRATEGIC OPPORTUNITY: Based on unmet need in orphan diseases or trial gaps, where could this molecule gain advantage?`

  return { system: SYSTEM_PROMPT, user }
}

export function buildRepurposingScanPrompt(context: MoleculeContext): { system: string; user: string } {
  const diseaseList = context.rich.diseaseAssociations.slice(0, 15).map(d => `${d.diseaseName} (gene=${d.geneSymbol || '?'}, score=${d.score.toFixed(2)}, sources=${d.sources.join(',')}) `).join('\n')
  const targetList = context.rich.topTargetActivities.slice(0, 10).map(t => `${t.targetName} (${t.targetOrganism}): ${t.standardType}=${t.standardValue} ${t.standardUnits}`).join('\n')
  const pathwayList = context.rich.pathwayNames.map(p => p.name).join('; ')
  const currentInds = context.rich.indicationDetails.map(i => i.condition).join('; ')
  const trialConds: string[] = []
  for (const t of context.rich.trialDetails) {
    for (const c of t.conditions) if (!trialConds.includes(c)) trialConds.push(c)
  }
  const orphanList = context.rich.orphanDiseases.join('; ')
  const ppiList = context.rich.proteinInteractions.slice(0, 6).map(pi => `${pi.partnerA} <-> ${pi.partnerB}`).join('; ')
  const geneList = context.rich.geneDetails.slice(0, 8).map(g => `${g.symbol}: ${g.summary?.slice(0, 80) || g.name}`).join('; ')
  const chebiList = context.rich.chebiDetails.map(c => `${c.name} [${c.roles.join(', ')}]`).join('; ')
  const gwasGeneList = context.rich.pharmacogenomicGenes.join(', ')

  const user = `Scan for drug repurposing opportunities for ${context.identity.name}. This molecule is ALREADY approved/investigated for: ${currentInds || 'unknown'}.

TARGETS:
${targetList || 'No target data'}

DISEASE ASSOCIATIONS from genomics (these may reveal unexplored therapeutic links):
${diseaseList || 'No disease data'}

PATHWAYS:
${pathwayList || 'No pathway data'}

GENES:
${geneList || 'No gene data'}

PROTEIN INTERACTIONS:
${ppiList || 'No PPI data'}

ORPHAN DISEASES:
${orphanList || 'None found'}

PHARMACOGENOMIC GENES:
${gwasGeneList || 'None'}

ChEBI ROLES:
${chebiList || 'None'}

CHEMICAL PROPERTIES:
- Lipinski: ${context.chemical.followsLipinski === true ? 'PASS' : context.chemical.followsLipinski === false ? 'FAIL' : 'N/A'}
- LogP: ${context.chemical.logP ?? '?'} | MW: ${context.chemical.molecularWeight ?? '?'}

SAFETY:
- Risk: ${context.safety.overallRisk} | AEs: ${context.safety.adverseEventCount} | Boxed warning: ${context.safety.hasBoxedWarning ? 'YES' : 'No'}

For each repurposing candidate:
1. NEW INDICATION: The disease/condition NOT currently being pursued
2. BIOLOGICAL LOGIC: How does the drug's EXISTING target engagement address this disease's biology? Connect specific targets to specific disease mechanisms.
3. EVIDENCE: What in the data supports this connection? (gene-disease associations, pathway overlap, PPI network, ChEBI roles)
4. FEASIBILITY: Is the drug's safety profile appropriate for this new population? Is the dosing/route realistic for this indication?
5. COMPETITIVE ADVANTAGE: Does this new indication have high unmet need? Few existing treatments? Orphan status?
6. NEXT STEP: What preclinical or clinical experiment would validate this? Be specific about assay, model, and endpoint.

Generate 3-5 ranked repurposing hypotheses. Prioritize those where the mechanistic logic is strongest and the existing safety data supports use in the new population.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildCrossMoleculeComparePrompt(context: MoleculeContext, previousMolecules: SessionMoleculeSummary[]): { system: string; user: string } {
  const currentMoA = context.rich.mechanismDetails.slice(0, 3).map(m => `${m.mechanismOfAction} -> ${m.targetName}`).join('; ') || 'No known MoA'
  const currentTargets = context.rich.topTargetActivities.slice(0, 5).map(t => `${t.targetName} (${t.standardType}=${t.standardValue} ${t.standardUnits})`).join('; ') || 'None'
  const currentAEs = context.rich.topAdverseEvents.slice(0, 5).map(ae => `${ae.reactionName} (${ae.count})`).join('; ') || 'None'
  const currentInds = context.rich.indicationDetails.slice(0, 5).map(i => i.condition).join('; ') || 'None'

  const prevSummaries = previousMolecules.map(pm => {
    const section = `--- ${pm.name} ---
Mechanisms: ${pm.mechanisms.join('; ') || 'Unknown'}
Top targets: ${pm.topTargets.join('; ') || 'None'}
Top AEs: ${pm.topAEs.join('; ') || 'None'}
Indications: ${pm.indications.join('; ') || 'None'}`
    return section
  }).join('\n\n')

  const user = `Compare ${context.identity.name} against other molecules the researcher has examined in this session.

CURRENT MOLECULE: ${context.identity.name}
Mechanisms: ${currentMoA}
Key targets: ${currentTargets}
Top adverse events: ${currentAEs}
Indications: ${currentInds}

PREVIOUSLY VIEWED MOLECULES:
${prevSummaries || 'No other molecules viewed in this session'}

Provide a cross-molecule comparative analysis:
1. MECHANISTIC OVERLAP: Do any of these molecules share targets or pathways? If so, what does that imply about therapeutic redundancy or complementarity?
2. SAFETY DIFFERENTIATION: Which molecule has the most favorable safety profile for a given indication? Name specific AE differences.
3. INDICATION COMPLEMENTARITY: Could any combination of these molecules be used together or in sequence? What biological rationale supports this?
4. REPURPOSING CROSS-POLLINATION: Could targets/mechanisms from one molecule suggest new uses for another? (e.g., if Drug A targets X for Disease Y, and Drug B also hits X but is used for Disease Z, could Drug B work for Disease Y?)
5. STRATEGIC RANKING: Rank these molecules for a researcher deciding where to invest further effort. Justify the ranking with specific data points.

Be specific — name the actual targets, AEs, and diseases that overlap or differ.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildFreeQAPrompt(context: MoleculeContext, question: string): { system: string; user: string } {
  const user = `The user asks: "${question}"

IMPORTANT: Answer as a drug discovery researcher, not a data reporter. If you just list data points without interpretation, you have failed. Every statement should answer "so what?" — what does this data mean for the science, the mechanism, or the next experiment?

Molecule context for ${context.identity.name} (CID ${context.identity.cid}):
${contextToBulletSummary(context)}

Answer the question using the available data. Be specific — cite names, values, and sources from the context. If the data is insufficient to answer fully, explain what's missing and suggest specific databases or experiments that would fill the gap. Do NOT just repeat counts — explain the science.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildFollowUpPrompt(history: { role: 'system' | 'user' | 'assistant'; content: string }[], context: MoleculeContext, question: string): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const contextBlock = contextToPromptBlock(context)
  const systemMsg = { role: 'system' as const, content: SYSTEM_PROMPT + `\n\nYou are in a continued conversation about ${context.identity.name}. Use the molecule data and conversation history for consistent, informed answers. CRITICAL: Do NOT just repeat data from the context. Every response must include your interpretation — what does the data MEAN biologically, pharmacologically, or clinically? What should the researcher do next? Be specific — name targets, genes, pathways, and values. Think scientifically.\n\nMOLECULE DATA:\n${contextBlock}` }

  const messages = [systemMsg, ...history]
  messages.push({ role: 'user', content: question })
  return messages
}

function contextToBulletSummary(ctx: MoleculeContext): string {
  return contextToPromptBlock(ctx)
}

function findInterestingSignals(ctx: MoleculeContext, snapshot: RetrievalSnapshot): string[] {
  const signals: string[] = []

  if (ctx.safety.hasBoxedWarning) signals.push('BOXED WARNING — FDA\'s strongest safety alert. Examine the mechanism behind this.')
  if (ctx.rich.recallDetails.length > 0) signals.push(`${ctx.rich.recallDetails.length} FDA recall(s): ${ctx.rich.recallDetails.slice(0, 3).map(r => r.reason).join('; ')}`)
  if (ctx.clinical.totalTrials > 50) signals.push(`${ctx.clinical.totalTrials} clinical trials — unusually high research intensity`)
  if (ctx.clinical.totalTrials === 0 && ctx.regulatory.approvedProductCount > 0) signals.push('Approved drug with ZERO clinical trials in database — data gap or legacy approval')
  if (ctx.biological.knownTargets > 10) signals.push(`${ctx.biological.knownTargets} targets — polypharmacology with potential for off-target effects and repurposing`)
  if (ctx.chemical.followsLipinski === false) signals.push('Fails Lipinski Rule of 5 — poor oral bioavailability predicted; what route is actually used?')
  if (ctx.rich.orphanDiseases.length > 0) signals.push(`${ctx.rich.orphanDiseases.length} orphan disease associations: ${ctx.rich.orphanDiseases.slice(0, 3).join(', ')} — repurposing potential`)
  if (ctx.regulatory.approvedProductCount === 0 && ctx.clinical.totalTrials > 0) signals.push(`Investigational compound — ${ctx.clinical.totalTrials} trials but no approved products yet`)
  if (ctx.research.patentCount > ctx.research.publicationCount * 2) signals.push(`Patents (${ctx.research.patentCount}) far exceed publications (${ctx.research.publicationCount}) — strong IP interest vs. open science`)
  if (ctx.rich.topAdverseEvents.length > 0 && ctx.rich.topAdverseEvents[0].count > 1000) signals.push(`Most frequent AE "${ctx.rich.topAdverseEvents[0].reactionName}" has ${ctx.rich.topAdverseEvents[0].count} reports — is this mechanism-related?`)
  if (ctx.rich.pharmacogenomicGenes.length > 0) signals.push(`Pharmacogenomic genes found: ${ctx.rich.pharmacogenomicGenes.join(', ')} — personalized dosing implications`)
  if (ctx.rich.mechanismDetails.length > 0) signals.push(`Known MoA: ${ctx.rich.mechanismDetails.slice(0, 2).map(m => `${m.mechanismOfAction} -> ${m.targetName}`).join('; ')} — use this to explain safety/efficacy patterns`)
  if (ctx.rich.proteinInteractions.length > 50) signals.push(`${ctx.rich.proteinInteractions.length} protein interactions — network hub with pleiotropic potential`)
  if (ctx.safety.recallCount > 0 && ctx.clinical.totalTrials > 0) signals.push('Has FDA recalls AND active trials — contradictory signals worth investigating')

  const aeMechLink = findAEMechanismLink(ctx)
  if (aeMechLink) signals.push(aeMechLink)

  for (const anomaly of snapshot.anomalies) {
    if (anomaly.severity === 'warning' || anomaly.severity === 'critical') {
      signals.push(anomaly.message)
    }
  }

  return signals
}

function findAEMechanismLink(ctx: MoleculeContext): string | null {
  if (ctx.rich.topAdverseEvents.length === 0 || ctx.rich.mechanismDetails.length === 0) return null
  const topAE = ctx.rich.topAdverseEvents[0].reactionName.toLowerCase()
  const moa = ctx.rich.mechanismDetails[0].mechanismOfAction.toLowerCase()
  const action = ctx.rich.mechanismDetails[0].actionType.toLowerCase()
  const aeName = ctx.rich.topAdverseEvents[0].reactionName
  const moaLabel = ctx.rich.mechanismDetails[0].mechanismOfAction

  const patterns: [string[], string[]][] = [
    [['inhibit', 'block', 'antagonist'], ['nausea', 'vomiting', 'diarrhea', 'gastro']],
    [['block', 'antagonist'], ['cardiac', 'bradycardia', 'arrhythm', 'hypotens']],
    [['inhibit', ' kinase'], ['rash', 'skin', 'dermat', 'alopecia']],
    [['serotonin', 'ssri', 'reuptake'], ['insomnia', 'headache', 'anxiety', 'nausea']],
    [['dopamine', 'd2', 'antipsych'], ['tremor', 'akathisia', 'parkinson', 'dyskine']],
    [['esterase', 'acetylcholinesterase', 'cholinesterase'], ['salivation', 'sweat', 'bradycardia', 'nausea']],
    [['aromatase', 'estrogen'], ['osteoporosis', 'bone', 'fracture', 'hot flash']],
    [['anticoagul', 'factor xa', 'thrombin'], ['bleeding', 'hemorr', 'bruis']],
    [['statin', 'hmg-coa', 'reductase'], ['myalgia', 'muscle', 'rhabdomyolysis', 'weakness']],
    [['beta', 'adrenergic'], ['fatigue', 'bradycardia', 'bronchospasm', 'dizziness']],
    [['ace', 'angiotensin'], ['cough', 'hyperkalemia', 'angioedema']],
    [['calcium channel', 'dihydropyridine'], ['edema', 'swelling', 'flush', 'headache']],
    [['methyl', 'transferase'], ['hepatotox', 'liver', 'elevated']],
    [['proteasome', 'bortezomib'], ['neuropathy', 'peripheral', 'thrombocyto']],
    [['par', 'parp', 'poly'], ['fatigue', 'nausea', 'anemia']],
    [['monoamine', 'mao'], ['hypertension', 'serotonin', 'headache']],
  ]

  for (const [moaPatterns, aePatterns] of patterns) {
    const moaMatch = moaPatterns.some(p => moa.includes(p) || action.includes(p))
    const aeMatch = aePatterns.some(p => topAE.includes(p))
    if (moaMatch && aeMatch) {
      return `Top AE "${aeName}" is likely mechanism-related to ${moaLabel}`
    }
  }

  const allAENames = ctx.rich.topAdverseEvents.slice(0, 5).map(ae => ae.reactionName.toLowerCase()).join(' ')
  const allTargets = ctx.rich.topTargetActivities.slice(0, 5).map(t => t.targetName.toLowerCase()).join(' ')
  if (allTargets.includes('serotonin') && allAENames.includes('nausea')) return `Serotonergic activity may explain nausea in AE profile`
  if (allTargets.includes('dopamine') && (allAENames.includes('tremor') || allAENames.includes('nausea'))) return `Dopaminergic activity may explain observed AEs`

  return null
}

export function buildDiseaseAutoInsightPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze the disease search results below. Do NOT just list what was found — instead, identify 3-4 genuinely surprising scientific findings that connect diseases, molecules, and therapeutic areas.

For each finding:
- State the SPECIFIC observation with exact disease names, molecule targets, and therapeutic areas
- Explain the clinical or therapeutic SIGNIFICANCE — why does this matter?
- Connect it to at least ONE other result (e.g., shared molecules across diseases, overlapping therapeutic areas suggesting repurposing opportunities)

BAD EXAMPLE: "Found 3 diseases: Diabetes, Type 2 diabetes, and Diabetic neuropathy. They have some molecules."
GOOD EXAMPLE: "Type 2 diabetes and hypertension share therapeutic area overlap in metabolic disease — and both list Metformin as a candidate molecule, suggesting a common mechanism (AMPK activation) that could be leveraged for patients with comorbid metabolic syndrome."

${diseaseContext}

IMPORTANT: Your insights should teach a researcher something they wouldn't get from just reading the list. Synthesize across the disease results to find non-obvious connections.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseQAPrompt(diseaseContext: string, question: string): { system: string; user: string } {
  const user = `The user asks: "${question}"

IMPORTANT: Answer as a drug discovery researcher, not a data reporter. If you just list data points without interpretation, you have failed. Every statement should answer "so what?" — what does this data mean for the disease, the therapeutic landscape, or the next experiment?

${diseaseContext}

Answer the question using the available disease data. Be specific — cite disease names, molecule targets, and sources from the context. If the data is insufficient to answer fully, explain what's missing and suggest specific searches or experiments that would fill the gap. Do NOT just repeat what's in the data — explain the science and therapeutic implications.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchBriefPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Write an executive intelligence brief summarizing the disease search results. Structure it as:

1. LANDSCAPE OVERVIEW: What disease area are we looking at? Name the key conditions and how they relate (comorbidities, disease subtypes, spectrum disorders). Cite specific disease names and therapeutic areas.
2. KEY ASSETS: Which candidate molecules appear across multiple diseases? These shared molecules suggest cross-disease therapeutic potential — name them and explain the biological logic of why they appear.
3. STRATEGIC GAPS: Which diseases have NO candidate molecules? What does this mean — are they understudied, or are they genetically complex conditions that lack clear druggable targets?
4. NEXT QUERY: What specific disease or molecule should the researcher investigate next? Suggest a concrete action (e.g., "Search for [disease name] to explore its gene associations" or "Look up [molecule name]'s mechanism of action").

${diseaseContext}

Be concise — 1-2 sentences per section. Focus on what a decision-maker needs to know, not data recitation.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchGapPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze data gaps across the disease search results. Focus on what is MISSING and what that means.

For each significant gap:
1. DISEASES WITHOUT MOLECULES: Which diseases have no candidate molecules? Is this because they're rare/understudied, because their biology makes them hard to target, or because the search may have missed sources? Name the specific diseases.
2. THERAPEUTIC AREAS WITHOUT CANDIDATES: Are there therapeutic areas represented by diseases in the results that have NO molecules targeting them? This indicates a therapeutic desert.
3. DATA SOURCE GAPS: Which diseases come from only ONE source (e.g., only Open Targets, not DisGeNET or Orphanet)? These may have incomplete associations.
4. WHAT TO SEARCH NEXT: Which diseases with no molecules should the researcher click into to discover their gene associations and potential drug targets? Name 2-3 specific diseases and explain why they're worth investigating.

${diseaseContext}

Do NOT just list counts. Explain WHY each gap matters and what it implies for the research strategy.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchRepurposingPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Identify drug repurposing opportunities from the disease search results. The key signal is SHARED MOLECULES across different diseases — a drug that appears for multiple conditions may have unexplored therapeutic potential.

Strategy:
- Find molecules that appear in MORE THAN ONE disease result. These are your starting points.
- For each shared molecule, consider: is it already known to treat all those conditions, or does its appearance in a new disease context suggest a repurposing opportunity?
- Also consider: molecules that appear for ONE disease but target pathways shared with other diseases in the results — these are latent repurposing candidates.

For each repurposing opportunity (generate 2-4):
1. MOLECULE: Name and CID (if available)
2. KNOWN DISEASE: Where it's already established
3. TARGET DISEASE: A different disease from the results where it could be repurposed
4. BIOLOGICAL RATIONALE: Why might this work? (shared therapeutic areas, overlapping disease biology, known mechanism applicable to new condition)
5. EVIDENCE STRENGTH: Strong (molecule explicitly listed for target disease), Moderate (shared pathway/therapeutic area), or Speculative (biological plausibility only)
6. NEXT STEP: What should the researcher do to verify? (specific search, clinical trial query, or experiment)

${diseaseContext}

Prioritize opportunities with the strongest cross-disease signals. Do not suggest repurposing without a mechanistic rationale.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchMechanismPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze the shared biological mechanisms and pathways across the disease search results. The goal is to understand the mechanistic connections BETWEEN diseases, not just within each disease.

Focus on:
1. CONVERGENT PATHWAYS: Do multiple diseases share therapeutic areas? If so, what biological pathway or process underlies that convergence? Name specific pathways and the diseases connected by them.
2. DIVERGENT MECHANISMS: Are there diseases in the same therapeutic area with DIFFERENT candidate molecules? This suggests mechanistic heterogeneity — the same clinical phenotype may have distinct molecular drivers.
3. MOLECULE-TO-MECHANISM MAPPING: For key molecules that appear in the results, what is their known mechanism of action? How does it relate to the disease biology? If the MoA is unknown, flag it.
4. MECHANISTIC HIERARCHY: Rank the diseases by how well-understood their mechanism is (based on available molecule data). Which ones are mechanistically clear vs. black boxes?
5. CROSS-DISEASE MECHANISM: If a molecule appears for one disease but its mechanism is relevant to another disease in the results, describe the biological logic.

${diseaseContext}

Synthesize mechanisms across diseases. The value is in the CROSS-DISEASE connections, not the within-disease descriptions.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchHypothesisPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Generate novel therapeutic hypotheses based on the disease search results. This is the most creative/speculative analysis — propose ideas that the data supports but does not explicitly state.

For each hypothesis (generate 3-5):
1. HYPOTHESIS: A clear, falsifiable statement about treating a disease or condition
2. DISEASE TARGET: Which disease from the results this addresses
3. MOLECULAR STRATEGY: What molecule, target, or biological intervention would you propose? Name specifics from the data or from known pharmacology.
4. BIOLOGICAL LOGIC: The causal chain from intervention → mechanism → disease modification. Be specific about pathway names, gene families, or molecular processes.
5. NOVELTY: Why is this NOT obvious? What makes it different from standard-of-care or currently investigated approaches?
6. FALSIFICATION: What experiment or observation would DISPROVE this hypothesis? A good hypothesis is one you can kill.

Cross-reference: If multiple diseases share molecules or pathways, consider combination strategies or cross-indication approaches. If a disease has NO molecules, propose a gene- or pathway-based strategy grounded in the disease's therapeutic area.

${diseaseContext}

Be bold but rigorous. Every hypothesis must have a biological rationale, not just pattern-matching. Avoid restating known facts as hypotheses.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneTherapeuticPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.slice(0, 15).map(d => `${d.drugName}${d.interactionType ? ` (${d.interactionType})` : ''}`).join('; ')
  const diseaseList = ctx.diseaseAssociations.slice(0, 10).map(d => `${d.diseaseName} (score=${d.score.toFixed(2)})`).join('; ')
  const variantList = ctx.clinvarVariants.slice(0, 8).map(v => `${v.clinicalSignificance}${v.conditionName ? ` — ${v.conditionName}` : ''}`).join('; ')

  const user = `Analyze therapeutic opportunities for the gene ${ctx.symbol} (${ctx.name}).

Gene identity:
- Symbol: ${ctx.symbol} | Name: ${ctx.name} | Type: ${ctx.typeOfGene || 'unknown'}
- Location: chr ${ctx.chromosome || '?'} | Ensembl: ${ctx.ensemblId || '?'} | UniProt: ${ctx.uniprotId || '?'}
- Aliases: ${ctx.aliases.join(', ') || 'none'}
${ctx.summary ? `\nFunction: ${ctx.summary}` : ''}

DRUGS TARGETING THIS GENE:
${drugList || 'No targeted drugs found in data'}

DISEASE ASSOCIATIONS:
${diseaseList || 'No disease associations found'}

CLINICAL VARIANTS:
${variantList || 'No ClinVar data'}

PATHWAYS:
${ctx.pathwayNames.join('; ') || 'No pathway data'}

Provide a therapeutic opportunity analysis:
1. DRUGGABILITY: Is ${ctx.symbol} a druggable target? What type of protein does it encode? Are the existing drugs small molecules, antibodies, or other modalities? What does the interaction type distribution tell us about druggability?
2. DISEASE PRIORITIZATION: Which associated diseases have the strongest evidence and would benefit most from modulating this target? Rank the top 3-5 by therapeutic opportunity (evidence × unmet need).
3. MECHANISM-BASED LINKS: For each prioritized disease, explain the biological logic connecting ${ctx.symbol} to disease pathology. Are there pathway connections that strengthen the case?
4. COMPETITIVE LANDSCAPE: Based on the targeted drugs, who else is already targeting this gene? What modalities are they using? Is the space crowded or open?
5. NEXT EXPERIMENT: What ONE experiment would most advance the case for or against targeting ${ctx.symbol}?

Be specific — cite exact drug names, disease names, interaction types, and scores from the data above.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneRepurposingPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.map(d => `${d.drugName} [${d.interactionType || 'unknown'}] (sources: ${(d.sources ?? []).slice(0, 2).join(', ')})`).join('\n')
  const diseaseList = ctx.diseaseAssociations.slice(0, 12).map(d => `${d.diseaseName} (score=${d.score.toFixed(2)}, source=${d.source})`).join('\n')

  const user = `Identify drug repurposing opportunities for gene ${ctx.symbol} (${ctx.name}).

${ctx.summary ? `Gene function: ${ctx.summary.slice(0, 300)}` : ''}

DRUGS CURRENTLY TARGETING ${ctx.symbol}:
${drugList || 'No drugs found targeting this gene in available data'}

DISEASES ASSOCIATED WITH ${ctx.symbol}:
${diseaseList || 'No disease data'}

PATHWAYS: ${ctx.pathwayNames.join(', ') || 'No pathway data'}
VARIANTS: ${ctx.clinvarVariants.slice(0, 5).map(v => v.clinicalSignificance).join(', ') || 'No variant data'}

For each repurposing opportunity:
1. EXISTING DRUG → NEW INDICATION: Which drug already targeting ${ctx.symbol} could be repurposed for a different disease? What's the biological logic?
2. EVIDENCE BASE: What in the data supports this? (shared pathways, disease associations, variant data)
3. MECHANISM: How does modulating ${ctx.symbol} in this new context differ from its known use?
4. FEASIBILITY: Is the safety profile of the existing drug compatible with the new indication?
5. VALIDATION: What experiment would test this hypothesis? Be specific about model system, assay, and endpoint.

Generate 3-5 ranked repurposing hypotheses. Prioritize where the drug's known interaction type (inhibitor, agonist, etc.) aligns with the disease biology.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneMechanismPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.slice(0, 12).map(d => `${d.drugName}: ${d.interactionType || 'unknown interaction'} (${(d.sources ?? []).join(', ')})`).join('\n')
  const pathList = ctx.pathwayNames.join('; ')
  const goList = ctx.goTerms.slice(0, 12).join(', ')

  const user = `Provide a mechanism deep-dive for gene ${ctx.symbol} (${ctx.name}).

${ctx.summary ? `Function: ${ctx.summary}` : ''}

Type: ${ctx.typeOfGene || 'unknown'} | Location: chr ${ctx.chromosome || '?'}
Ensembl: ${ctx.ensemblId || 'N/A'} | UniProt: ${ctx.uniprotId || 'N/A'}

DRUG INTERACTIONS WITH ${ctx.symbol}:
${drugList || 'No drug interaction data'}

PATHWAYS INVOLVED:
${pathList || 'No pathway data'}

GENE ONTOLOGY:
${goList || 'No GO terms'}

DISEASE ASSOCIATIONS (top 5):
${ctx.diseaseAssociations.slice(0, 5).map(d => `- ${d.diseaseName} (score=${d.score.toFixed(2)})`).join('\n') || 'No disease data'}

Analyze:
1. PROTEIN FUNCTION: Based on the function summary and GO terms, what is the protein product of ${ctx.symbol} actually doing in the cell? What is its molecular role?
2. DRUG MODALITY ANALYSIS: Group the drugs by interaction type. Are most inhibitors? Agonists? Allosteric modulators? What does this distribution reveal about the target's druggability and the approaches that have worked (or failed)?
3. PATHWAY CONTEXT: How does ${ctx.symbol} fit into the biological pathways listed? Is it upstream (regulator), downstream (effector), or a central hub? What happens when its activity changes?
4. ON-TARGET vs OFF-TARGET: For the top 3 drugs, which effects are likely on-target (directly from ${ctx.symbol} modulation) vs. off-target?
5. GAP ASSESSMENT: What key mechanistic questions remain unanswered? What experiment would clarify the mechanism most?`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneTargetAssessmentPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugCount = ctx.targetedDrugs.length
  const inhibitorCount = ctx.targetedDrugs.filter(d => d.interactionType?.toLowerCase().includes('inhibitor') || d.interactionType?.toLowerCase().includes('antagonist') || d.interactionType?.toLowerCase().includes('blocker')).length
  const agonistCount = ctx.targetedDrugs.filter(d => d.interactionType?.toLowerCase().includes('agonist') || d.interactionType?.toLowerCase().includes('activator')).length
  const diseaseCount = ctx.diseaseAssociations.length
  const pathogenCount = ctx.clinvarVariants.filter(v => v.clinicalSignificance?.toLowerCase().includes('pathogenic')).length
  const benignCount = ctx.clinvarVariants.filter(v => v.clinicalSignificance?.toLowerCase().includes('benign')).length

  const topDrugs = ctx.targetedDrugs.slice(0, 8).map(d => `${d.drugName} [${d.interactionType || '?'}]`).join(', ')
  const topDiseases = ctx.diseaseAssociations.slice(0, 8).map(d => `${d.diseaseName} (${d.score.toFixed(2)})`).join(', ')

  const user = `Assess ${ctx.symbol} (${ctx.name}) as a therapeutic target.

TARGET PROFILE:
- Gene: ${ctx.symbol} | Type: ${ctx.typeOfGene || 'unknown'} | Location: chr ${ctx.chromosome || '?'}
- Druggability indicators: ${drugCount} known drug interactions (${inhibitorCount} inhibitors/antagonists, ${agonistCount} agonists/activators)
- Disease associations: ${diseaseCount} diseases linked
- Variants: ${pathogenCount} pathogenic, ${benignCount} benign, ${ctx.clinvarVariants.length - pathogenCount - benignCount} VUS/other
${ctx.summary ? `- Function: ${ctx.summary.slice(0, 200)}` : ''}

TOP DRUGS: ${topDrugs || 'None found'}
TOP DISEASES: ${topDiseases || 'None found'}
ALIASES: ${ctx.aliases.join(', ') || 'none'}
ENSEMBL: ${ctx.ensemblId || 'N/A'} | UniProt: ${ctx.uniprotId || 'N/A'}
PATHWAYS: ${ctx.pathwayNames.join(', ') || 'None found'}

Assess:
1. DRUGGABILITY SCORE: On a scale of Low/Medium/High, how druggable is ${ctx.symbol}? Justify with: protein class (enzyme, receptor, TF, etc.), existing drug evidence, and structural considerations.
2. MODALITY FIT: Which therapeutic modality is most appropriate — small molecule, antibody, RNA therapeutic, gene therapy? What does the existing drug evidence suggest?
3. SAFETY CONCERNS: Based on the gene's function and ${pathogenCount} pathogenic variants, what are the potential on-target toxicity risks of modulating ${ctx.symbol}? Would inhibition or activation be more likely to cause problems?
4. COMPETITIVE INTELLIGENCE: How crowded is this target space? Are the existing drugs for approved indications only, or are there investigational compounds? What's the modality split?
5. INVESTMENT CASE: Bottom line — should a drug discovery team invest in this target? What's the strongest rationale? What's the biggest risk?

Be direct and actionable. A researcher needs to decide whether to pursue this target.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneQAPrompt(ctx: GeneContext, question: string): { system: string; user: string } {
  const user = `The user asks: "${question}"

IMPORTANT: Answer as a drug discovery researcher focused on this gene target. Every statement should answer "so what?" — what does this mean for druggability, therapeutic opportunity, or the next experiment?

Gene context for ${ctx.symbol} (${ctx.name}):
${geneContextToPromptBlock(ctx)}

Answer the question using the available data. Be specific — cite drug names, disease associations, interaction types, and scores. If the data is insufficient, explain what's missing and suggest specific experiments or databases that would fill the gap.`

  return { system: SYSTEM_PROMPT, user }
}

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

// ============================================================================
// PLAN 06: AI tasks beyond summarization
// 4 new prompt modes that produce structured output validated by post-processors
// ============================================================================

/**
 * Prior-art query generator. Produces a Boolean search string suitable for
 * pasting into USPTO / Google Patents / EuropePMC.
 *
 * Strict output contract: a SINGLE LINE Boolean query, no preamble.
 */
export function buildPriorArtQueryPrompt(context: MoleculeContext): { system: string; user: string } {
  const synonyms = (context.identity.synonyms ?? []).slice(0, 6)
  const targets = context.rich.topTargetActivities.slice(0, 4).map(t => t.targetName).filter(Boolean)
  const mechanisms = context.rich.mechanismDetails.slice(0, 3).map(m => m.mechanismOfAction).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 4).map(i => i.condition).filter(Boolean)

  const system = `You are a patent-search query generator. Your ONLY job is to return a Boolean query string. You output NOTHING ELSE — no preamble, no explanation, no markdown, no code fence, no quotes around the whole result. Just the raw query on a single line.`

  const user = `Generate a Boolean search query for prior-art / patent search for the molecule "${context.identity.name}".

Use this data to build the query:
- Primary name: ${context.identity.name}
- Synonyms: ${synonyms.length > 0 ? synonyms.join(', ') : '(none — use the primary name only)'}
- Top biological targets: ${targets.length > 0 ? targets.join(', ') : '(none)'}
- Mechanisms: ${mechanisms.length > 0 ? mechanisms.join(', ') : '(none)'}
- Indications / clinical context: ${indications.length > 0 ? indications.join(', ') : '(none)'}

Output format requirements (STRICT):
- A SINGLE LINE Boolean query
- Use double quotes around multi-word terms
- Use OR to group synonyms of the molecule
- Use AND to require a target / mechanism
- Optionally use OR to broaden indication context inside parentheses
- Use balanced parentheses to group terms
- The query MUST contain the primary molecule name "${context.identity.name}"
- Do NOT include explanation, prose, or markdown
- Do NOT wrap the entire output in quotes
- Do NOT prefix with "Query:" or anything similar

Example of well-formed output (do NOT copy verbatim — generate one for the molecule above):
("aspirin" OR "acetylsalicylic acid") AND ("cyclooxygenase" OR "COX-1" OR "COX-2") AND (prevention OR therapy OR treatment)

Now produce the query for "${context.identity.name}":`

  return { system, user }
}

/**
 * Differential safety profile between current molecule and one previously-viewed
 * molecule. Output is 3-5 short paragraphs.
 */
export function buildDifferentialSafetyPrompt(context: MoleculeContext, other: SessionMoleculeSummary): { system: string; user: string } {
  // Truncate intelligently for 7B models — top 5 AEs, top 3 mechanisms, top 3 regulatory facts each.
  const currentAEs = context.rich.topAdverseEvents.slice(0, 5).map(ae => `${ae.reactionName} (${ae.count} reports, ${ae.serious} serious)`).join('; ') || 'none reported'
  const currentMechs = context.rich.mechanismDetails.slice(0, 3).map(m => `${m.mechanismOfAction} -> ${m.targetName}`).join('; ') || 'unknown'
  const currentRegFacts = [
    `Risk: ${context.safety.overallRisk}`,
    `Boxed warning: ${context.safety.hasBoxedWarning ? 'YES' : 'No'}`,
    `Recalls: ${context.safety.recallCount}`,
  ].slice(0, 3).join(' | ')
  const currentInds = context.rich.indicationDetails.slice(0, 3).map(i => i.condition).filter(Boolean).join(', ') || 'none listed'

  const otherAEs = other.topAEs.slice(0, 5).join('; ') || 'none reported'
  const otherMechs = other.mechanisms.slice(0, 3).join('; ') || 'unknown'
  const otherInds = other.indications.slice(0, 3).join(', ') || 'none listed'

  const user = `Write a differential safety profile contrasting two drugs. Both molecule names MUST appear by name in your output.

CURRENT MOLECULE: ${context.identity.name} (CID ${context.identity.cid})
- Mechanisms: ${currentMechs}
- Top adverse events: ${currentAEs}
- Regulatory: ${currentRegFacts}
- Indications: ${currentInds}

COMPARISON MOLECULE: ${other.name}
- Mechanisms: ${otherMechs}
- Top adverse events: ${otherAEs}
- Indications: ${otherInds}

Produce 3-5 short paragraphs. Each paragraph is a single block of text separated from the next by a BLANK LINE. Cover, in order:

1. SHARED ADVERSE EVENTS — Which AEs appear in both, and what does the overlap suggest mechanistically?
2. DIVERGENT RISKS — Which AEs are unique to one drug? Why?
3. SEVERITY COMPARISON — Which drug has the more concerning serious-event profile, and why?
4. REGULATORY STATUS — How do approval / boxed-warning / recall histories differ?

Rules:
- Both names "${context.identity.name}" and "${other.name}" MUST appear at least once
- 3 to 5 paragraphs total — no more, no fewer
- Separate each paragraph with a BLANK line (one empty newline between paragraphs)
- Do NOT use bullet points or numbered lists — use prose paragraphs
- Do NOT include a title or heading
- Be specific — name the AEs, not "various adverse events"`

  return { system: SYSTEM_PROMPT, user }
}

/**
 * Suggest 3-5 next entities to explore. Output is a JSON code block.
 */
export function buildSuggestNextPrompt(context: MoleculeContext): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 6).map(t => t.targetName).filter(Boolean)
  const mechanisms = context.rich.mechanismDetails.slice(0, 4).map(m => `${m.mechanismOfAction} -> ${m.targetName}`)
  const diseases = context.rich.diseaseAssociations.slice(0, 6).map(d => d.diseaseName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 5).map(i => i.condition).filter(Boolean)
  const genes = context.rich.geneDetails.slice(0, 6).map(g => g.symbol).filter(Boolean)
  const pathways = context.rich.pathwayNames.slice(0, 5).map(p => p.name).filter(Boolean)

  const user = `Suggest 3-5 entities a researcher should explore next, given they've just looked at ${context.identity.name}. Each suggestion must be one of: a related molecule, a target gene, or a related disease.

CURRENT MOLECULE CONTEXT:
- Name: ${context.identity.name}
- Top targets: ${targets.join(', ') || '(none)'}
- Mechanisms: ${mechanisms.join('; ') || '(none)'}
- Disease associations: ${diseases.join(', ') || '(none)'}
- Current indications: ${indications.join(', ') || '(none)'}
- Key genes in pathways: ${genes.join(', ') || '(none)'}
- Pathways: ${pathways.join(', ') || '(none)'}

OUTPUT REQUIREMENTS — STRICT:
You MUST return ONLY a fenced JSON code block. No preamble, no explanation, no text before or after the fence. The shape is an array of 3-5 objects, each with EXACTLY these fields:
- "type": one of "molecule", "gene", or "disease"
- "name": a short string naming the entity (gene symbol, disease name, or drug name)
- "reason": a single sentence (max 25 words) explaining WHY this entity is worth looking at next

Example of valid output (do NOT copy verbatim — generate suggestions for ${context.identity.name}):
\`\`\`json
[
  {"type": "gene", "name": "EGFR", "reason": "Top binding target above; explore EGFR-driven indications beyond current ones."},
  {"type": "molecule", "name": "Gefitinib", "reason": "Same EGFR mechanism — useful resistance/selectivity comparison."},
  {"type": "disease", "name": "Non-small cell lung cancer", "reason": "Shared target landscape and unmet need for combination therapies."}
]
\`\`\`

Generate the JSON now. Output ONLY the fenced JSON block — nothing else.`

  return { system: SYSTEM_PROMPT, user }
}

/**
 * Hypothesis seed: takes a free-form research question and proposes a
 * structured Filter[] for plan 01's hypothesis builder.
 */
export function buildHypothesisSeedPrompt(context: MoleculeContext, researchQuestion: string): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 5).map(t => t.targetName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 5).map(i => i.condition).filter(Boolean)
  const atc = context.rich.atcClasses.slice(0, 4).filter(Boolean)
  const phases = Object.entries(context.clinical.phaseBreakdown).map(([k, v]) => `${k}=${v}`).join(', ')

  const user = `A researcher asked: "${researchQuestion}"

Context — current molecule: ${context.identity.name}
- Top targets (gene symbols if available): ${targets.join(', ') || '(none)'}
- Current indications: ${indications.join(', ') || '(none)'}
- ATC classes: ${atc.join(', ') || '(none)'}
- Trial phases on file: ${phases || '(none)'}

Translate the researcher's question into 2-3 filters for the BioIntel Hypothesis Builder. The builder intersects molecules that match ALL filters.

The ONLY valid filter axes are:
- "targets_gene"   — value is a gene symbol (e.g. "EGFR", "BRCA1")
- "indicated_for"  — value is a disease name (e.g. "melanoma", "asthma")
- "trial_phase"    — value is one of "1", "2", "3", or "4"
- "atc_class"      — value is an ATC code (e.g. "L01", "N02BA")

OUTPUT REQUIREMENTS — STRICT:
You MUST return ONLY a fenced JSON code block. The shape is an array of 2-3 objects, each with EXACTLY these fields:
- "axis":  one of "targets_gene", "indicated_for", "trial_phase", "atc_class"
- "value": a non-empty string appropriate for that axis

Example of valid output (do NOT copy verbatim — generate filters for the question above):
\`\`\`json
[
  {"axis": "targets_gene", "value": "EGFR"},
  {"axis": "trial_phase", "value": "3"}
]
\`\`\`

Generate the JSON filters now. Output ONLY the fenced JSON block.`

  return { system: SYSTEM_PROMPT, user }
}