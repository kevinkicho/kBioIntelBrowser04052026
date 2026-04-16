import { extractRichData } from './ai/contextBuilder'

export interface BriefSection {
  title: string
  emoji: string
  bullets: string[]
  sentiment: 'positive' | 'neutral' | 'caution' | 'warning'
}

export interface StructuredBrief {
  headline: string
  sections: BriefSection[]
  generatedAt: string
}

function safeLen(val: unknown): number {
  return Array.isArray(val) ? val.length : 0
}

export function buildStructuredBrief(
  data: Record<string, unknown>,
  moleculeName: string,
): StructuredBrief {
  const rich = extractRichData(data)
  const companies = safeLen(data.companies)
  const ndcProducts = safeLen(data.ndcProducts)
  const orangeBook = safeLen(data.orangeBookEntries)
  const drugLabels = safeLen(data.drugLabels)
  const adverseEvents = safeLen(data.adverseEvents)
  const recalls = safeLen(data.drugRecalls)
  const trials = safeLen(data.clinicalTrials)
  const literature = Math.max(safeLen(data.literature), safeLen(data.semanticPapers), safeLen(data.openAlexWorks))
  const patents = safeLen(data.patents)
  const nihGrants = safeLen(data.nihGrants)
  const drugInteractions = safeLen(data.drugInteractions)
  const pdbStructures = safeLen(data.pdbStructures)
  const uniprotEntries = safeLen(data.uniprotEntries)

  const seriousEvents = rich.topAdverseEvents.reduce((sum, ae) => sum + ae.serious, 0)

  const mechLabel = rich.mechanismDetails.length > 0
    ? `${rich.mechanismDetails[0].mechanismOfAction} -> ${rich.mechanismDetails[0].targetName}`
    : ''

  const topTargetStr = rich.topTargetActivities.slice(0, 3).map(t =>
    `${t.targetName} (${t.standardType}=${t.standardValue} ${t.standardUnits})`
  ).join(', ')

  const trialCondSet = new Set<string>()
  for (const t of rich.trialDetails) {
    for (const c of t.conditions) if (trialCondSet.size < 8) trialCondSet.add(c)
  }
  const trialCondStr = Array.from(trialCondSet).join(', ')

  const phases: Record<string, number> = {}
  for (const t of rich.trialDetails) {
    const phase = t.phase.toLowerCase()
    if (phase.includes('4')) phases['Phase 4'] = (phases['Phase 4'] || 0) + 1
    else if (phase.includes('3')) phases['Phase 3'] = (phases['Phase 3'] || 0) + 1
    else if (phase.includes('2')) phases['Phase 2'] = (phases['Phase 2'] || 0) + 1
    else if (phase.includes('1')) phases['Phase 1'] = (phases['Phase 1'] || 0) + 1
  }
  const phaseStr = Object.entries(phases).map(([k, v]) => `${k}: ${v}`).join(', ')

  let headline = `${moleculeName}: `
  if (mechLabel) headline += `${mechLabel.split('->')[0]?.trim() || 'Drug'} — `
  if (companies > 0 && trials > 0) {
    headline += `Approved with ${trials} trials (recruiting in: ${trialCondStr || 'N/A'})`
  } else if (companies > 0) {
    headline += `Approved drug — ${rich.indicationDetails.slice(0, 3).map(i => i.condition).join(', ') || 'indications in ChEMBL'}`
  } else if (trials > 0) {
    headline += `Investigational — ${trials} trials, conditions: ${trialCondStr || 'N/A'}`
  } else if (literature > 0) {
    headline += `Research compound — ${literature} publications, ${rich.geneDetails.length > 0 ? `genes: ${rich.geneDetails.slice(0, 3).map(g => g.symbol).join(', ')}` : 'no gene data'}`
  } else {
    headline += `Molecule under investigation`
  }

  const sections: BriefSection[] = []

  const mechBullets: string[] = []
  if (rich.mechanismDetails.length > 0) {
    mechBullets.push(...rich.mechanismDetails.slice(0, 3).map(m =>
      `${m.mechanismOfAction} -> ${m.targetName} (${m.actionType}, phase ${m.maxPhase === -1 ? '?' : m.maxPhase})`
    ))
  }
  if (topTargetStr) mechBullets.push(`Top targets: ${topTargetStr}`)
  if (rich.pathwayNames.length > 0) mechBullets.push(`Pathways: ${rich.pathwayNames.slice(0, 5).map(p => p.name).join(', ')}`)
  if (rich.geneDetails.length > 0) mechBullets.push(`Key genes: ${rich.geneDetails.slice(0, 5).map(g => `${g.symbol} (${g.name})`).join(', ')}`)
  if (rich.diseaseAssociations.length > 0) mechBullets.push(`Disease links: ${rich.diseaseAssociations.slice(0, 5).map(d => `${d.diseaseName}${d.geneSymbol ? ` [${d.geneSymbol}]` : ''}`).join(', ')}`)
  if (mechBullets.length > 0) sections.push({
    title: 'Mechanism & Biology',
    emoji: '🎯',
    bullets: mechBullets,
    sentiment: 'positive',
  })

  const regBullets: string[] = []
  if (companies > 0) regBullets.push(`${companies} approved product${companies > 1 ? 's' : ''}`)
  if (ndcProducts > 0) regBullets.push(`${ndcProducts} NDC codes`)
  if (orangeBook > 0) regBullets.push(`${orangeBook} Orange Book entries`)
  if (drugLabels > 0) regBullets.push(`${drugLabels} FDA drug labels`)
  if (rich.indicationDetails.length > 0) regBullets.push(`Indications: ${rich.indicationDetails.slice(0, 5).map(i => `${i.condition} (phase ${i.maxPhase === -1 ? '?' : i.maxPhase})`).join(', ')}`)
  if (rich.atcClasses.length > 0) regBullets.push(`ATC: ${rich.atcClasses.join(', ')}`)
  if (regBullets.length === 0) regBullets.push('No marketed products in FDA databases')
  sections.push({
    title: 'Regulatory Status',
    emoji: '📋',
    bullets: regBullets,
    sentiment: companies > 0 ? 'positive' : 'neutral',
  })

  if (trials > 0) {
    const clinBullets: string[] = []
    if (phaseStr) clinBullets.push(`${trials} trials (${phaseStr})`)
    else clinBullets.push(`${trials} clinical trials`)
    if (trialCondStr) clinBullets.push(`Conditions: ${trialCondStr}`)
    if (rich.trialDetails.length > 0) clinBullets.push(`Key trials: ${rich.trialDetails.slice(0, 3).map(t => `[${t.nctId}] ${t.phase} — ${t.conditions.join(', ')}`).join('; ')}`)
    sections.push({
      title: 'Clinical Pipeline',
      emoji: '🔬',
      bullets: clinBullets,
      sentiment: 'positive',
    })
  }

  if (adverseEvents > 0 || recalls > 0 || drugInteractions > 0) {
    const safeBullets: string[] = []
    if (adverseEvents > 0) safeBullets.push(`${adverseEvents} AE reports (${seriousEvents} serious)`)
    if (rich.topAdverseEvents.length > 0) safeBullets.push(`Top AEs: ${rich.topAdverseEvents.slice(0, 5).map(ae => `${ae.reactionName} (${ae.count})`).join(', ')}`)
    if (rich.recallDetails.length > 0) safeBullets.push(`Recalls: ${rich.recallDetails.slice(0, 3).map(r => `${r.classification}: ${r.reason} (${r.recallingFirm})`).join('; ')}`)
    if (rich.drugInteractionDetails.length > 0) safeBullets.push(`Drug interactions: ${rich.drugInteractionDetails.slice(0, 3).map(di => `${di.drugName} [${di.severity}]`).join(', ')}`)
    if (rich.pharmacogenomicGenes.length > 0) safeBullets.push(`Pharmacogenomic genes: ${rich.pharmacogenomicGenes.join(', ')}`)
    if (rich.siderSideEffects.length > 0) safeBullets.push(`SIDER: ${rich.siderSideEffects.slice(0, 6).join(', ')}`)
    sections.push({
      title: 'Safety Profile',
      emoji: '🛡️',
      bullets: safeBullets,
      sentiment: recalls > 0 ? 'warning' : seriousEvents > 100 ? 'caution' : 'neutral',
    })
  }

  if (literature > 0 || patents > 0 || nihGrants > 0) {
    const resBullets: string[] = []
    if (literature > 0) resBullets.push(`${literature} publications`)
    if (rich.publicationDetails.length > 0) resBullets.push(`Recent: ${rich.publicationDetails.slice(0, 3).map(p => `"${p.title.slice(0, 60)}" (${p.journal}, ${p.year})`).join('; ')}`)
    if (patents > 0) {
      resBullets.push(`${patents} patents`)
      if (rich.patentDetails.length > 0) resBullets.push(`Key: ${rich.patentDetails.slice(0, 3).map(p => `${p.patentNumber} (${p.assignee}, exp ${p.expirationDate})`).join('; ')}`)
    }
    if (nihGrants > 0) resBullets.push(`${nihGrants} NIH grants`)
    sections.push({
      title: 'Research Landscape',
      emoji: '📊',
      bullets: resBullets,
      sentiment: 'positive',
    })
  }

  if (pdbStructures > 0 || uniprotEntries > 0) {
    const strBullets: string[] = []
    if (uniprotEntries > 0) strBullets.push(`${uniprotEntries} UniProt entries`)
    if (pdbStructures > 0) strBullets.push(`${pdbStructures} PDB structures`)
    if (rich.proteinDetails.length > 0) strBullets.push(`Proteins: ${rich.proteinDetails.slice(0, 3).map(p => `${p.proteinName} (${p.geneName})`).join(', ')}`)
    sections.push({
      title: 'Structural Biology',
      emoji: '🧬',
      bullets: strBullets,
      sentiment: 'positive',
    })
  }

  return {
    headline,
    sections,
    generatedAt: new Date().toISOString(),
  }
}

export function buildOllamaPrompt(brief: StructuredBrief, moleculeName: string): string {
  const bulletText = brief.sections
    .map(s => `${s.title}:\n${s.bullets.map(b => `  - ${b}`).join('\n')}`)
    .join('\n\n')

  return `You are a pharmaceutical research analyst. Given the following data about the molecule "${moleculeName}", write a concise 3-4 sentence executive summary that provides genuine scientific insight. Do NOT just repeat the counts — synthesize the mechanism, therapeutic niche, key risk, and most important next research step. Connect the mechanism to the safety profile where possible. Name specific targets, genes, and adverse events.

Data:
${bulletText}

Executive Summary:`
}