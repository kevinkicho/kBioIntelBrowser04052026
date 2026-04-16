import type { MoleculeContext } from './contextBuilder'
import { contextToPromptBlock } from './contextBuilder'
import { formatRetrievalSummary, type RetrievalSnapshot } from './retrievalMonitor'

export interface SessionMoleculeSummary {
  name: string
  searchedAt: string
  topTargets: string[]
  topAEs: string[]
  mechanisms: string[]
  indications: string[]
}

export type PromptMode = 'auto_insight' | 'executive_brief' | 'gap_analysis' | 'safety_deep_dive' | 'mechanism_analysis' | 'therapeutic_hypothesis' | 'competitive_position' | 'repurposing_scan' | 'cross_molecule_compare' | 'free_qa' | 'followup'

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