/**
 * AI Research Summarizer
 * Generates structured intelligence briefs from aggregated molecule data.
 * Works independently of any LLM — the structured brief is self-contained.
 * When Ollama is available, it can optionally enhance the brief with natural language.
 */

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

function safeArr(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : []
}

export function buildStructuredBrief(
  data: Record<string, unknown>,
  moleculeName: string
): StructuredBrief {
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
  const targets = new Set(safeArr(data.chemblActivities).map(a => a.targetName).filter(Boolean)).size
  const mechanisms = safeLen(data.chemblMechanisms)
  const pathways = safeLen(data.reactomePathways) + safeLen(data.wikiPathways)
  const pdbStructures = safeLen(data.pdbStructures)
  const uniprotEntries = safeLen(data.uniprotEntries)
  const drugInteractions = safeLen(data.drugInteractions)
  const indications = safeLen(data.chemblIndications)

  const seriousEvents = safeArr(data.adverseEvents).reduce(
    (sum, e) => sum + (Number(e?.serious) || 0), 0
  )

  // --- Build headline ---
  let headline = `${moleculeName}: `
  if (companies > 0 && trials > 0) {
    headline += `Approved drug with ${trials} active clinical trials`
  } else if (companies > 0) {
    headline += `Approved drug with ${companies} marketed product${companies > 1 ? 's' : ''}`
  } else if (trials > 0) {
    headline += `Investigational compound — ${trials} clinical trials underway`
  } else if (literature > 0) {
    headline += `Research compound with ${literature} publications`
  } else {
    headline += `Molecule under investigation`
  }

  const sections: BriefSection[] = []

  // --- Regulatory Status ---
  const regBullets: string[] = []
  if (companies > 0) regBullets.push(`${companies} approved product${companies > 1 ? 's' : ''} on the market`)
  if (ndcProducts > 0) regBullets.push(`${ndcProducts} NDC code${ndcProducts > 1 ? 's' : ''} registered`)
  if (orangeBook > 0) regBullets.push(`${orangeBook} Orange Book entr${orangeBook > 1 ? 'ies' : 'y'} (patent/exclusivity data)`)
  if (drugLabels > 0) regBullets.push(`${drugLabels} FDA drug label${drugLabels > 1 ? 's' : ''} on file`)
  if (regBullets.length === 0) regBullets.push('No marketed products found in FDA databases')
  sections.push({
    title: 'Regulatory Status',
    emoji: '📋',
    bullets: regBullets,
    sentiment: companies > 0 ? 'positive' : 'neutral',
  })

  // --- Clinical Pipeline ---
  if (trials > 0 || indications > 0) {
    const clinBullets: string[] = []
    if (trials > 0) {
      const trialArr = safeArr(data.clinicalTrials)
      const phases: Record<string, number> = {}
      for (const t of trialArr) {
        const phase = String(t?.phase ?? '').toLowerCase()
        if (phase.includes('3')) phases['Phase 3'] = (phases['Phase 3'] || 0) + 1
        else if (phase.includes('2')) phases['Phase 2'] = (phases['Phase 2'] || 0) + 1
        else if (phase.includes('1')) phases['Phase 1'] = (phases['Phase 1'] || 0) + 1
        else if (phase.includes('4')) phases['Phase 4'] = (phases['Phase 4'] || 0) + 1
      }
      const phaseStr = Object.entries(phases).map(([k, v]) => `${k}: ${v}`).join(', ')
      clinBullets.push(`${trials} active clinical trials${phaseStr ? ` (${phaseStr})` : ''}`)
    }
    if (indications > 0) clinBullets.push(`${indications} known therapeutic indication${indications > 1 ? 's' : ''} in ChEMBL`)
    sections.push({
      title: 'Clinical Pipeline',
      emoji: '🔬',
      bullets: clinBullets,
      sentiment: 'positive',
    })
  }

  // --- Safety Profile ---
  if (adverseEvents > 0 || recalls > 0 || drugInteractions > 0) {
    const safeBullets: string[] = []
    if (adverseEvents > 0) safeBullets.push(`${adverseEvents} adverse event reports (${seriousEvents} classified as serious)`)
    if (recalls > 0) safeBullets.push(`⚠️ ${recalls} FDA recall${recalls > 1 ? 's' : ''} on record`)
    if (drugInteractions > 0) safeBullets.push(`${drugInteractions} known drug-drug interaction${drugInteractions > 1 ? 's' : ''}`)
    sections.push({
      title: 'Safety Profile',
      emoji: '🛡️',
      bullets: safeBullets,
      sentiment: recalls > 0 ? 'warning' : seriousEvents > 100 ? 'caution' : 'neutral',
    })
  }

  // --- Biological Activity ---
  if (targets > 0 || mechanisms > 0 || pathways > 0) {
    const bioBullets: string[] = []
    if (targets > 0) bioBullets.push(`Binds ${targets} known biological target${targets > 1 ? 's' : ''}`)
    if (mechanisms > 0) bioBullets.push(`${mechanisms} mechanism${mechanisms > 1 ? 's' : ''} of action documented`)
    if (pathways > 0) bioBullets.push(`Involved in ${pathways} biological pathway${pathways > 1 ? 's' : ''}`)
    sections.push({
      title: 'Biological Activity',
      emoji: '🎯',
      bullets: bioBullets,
      sentiment: 'positive',
    })
  }

  // --- Research Landscape ---
  if (literature > 0 || patents > 0 || nihGrants > 0) {
    const resBullets: string[] = []
    if (literature > 0) resBullets.push(`${literature} scientific publication${literature > 1 ? 's' : ''} indexed`)
    if (patents > 0) resBullets.push(`${patents} patent${patents > 1 ? 's' : ''} filed (IP landscape)`)
    if (nihGrants > 0) resBullets.push(`${nihGrants} NIH-funded research grant${nihGrants > 1 ? 's' : ''}`)
    sections.push({
      title: 'Research Landscape',
      emoji: '📊',
      bullets: resBullets,
      sentiment: 'positive',
    })
  }

  // --- Structural Biology ---
  if (pdbStructures > 0 || uniprotEntries > 0) {
    const strBullets: string[] = []
    if (uniprotEntries > 0) strBullets.push(`${uniprotEntries} protein target${uniprotEntries > 1 ? 's' : ''} characterized in UniProt`)
    if (pdbStructures > 0) strBullets.push(`${pdbStructures} 3D crystal structure${pdbStructures > 1 ? 's' : ''} available in PDB`)
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

/**
 * Builds the prompt to send to Ollama for AI-enhanced summarization.
 */
export function buildOllamaPrompt(brief: StructuredBrief, moleculeName: string): string {
  const bulletText = brief.sections
    .map(s => `${s.title}:\n${s.bullets.map(b => `  - ${b}`).join('\n')}`)
    .join('\n\n')

  return `You are a pharmaceutical research analyst. Given the following data about the molecule "${moleculeName}", write a concise 3-4 sentence executive summary for a researcher. Be factual, highlight what's most interesting, and note any safety concerns. Do not use markdown formatting.

Data:
${bulletText}

Executive Summary:`
}
