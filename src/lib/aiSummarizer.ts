import { extractRichData } from './ai/contextBuilder'

export interface BriefSection {
  title: string
  emoji: string
  bullets: string[]
  sentiment: 'positive' | 'neutral' | 'caution' | 'warning'
  /** Profile field keys that fed this section (transparency) */
  sourceFields?: string[]
}

/** Full transparency for Research Intelligence Brief consumers. */
export interface BriefProvenance {
  /** Why this card appears on the profile */
  whyAvailable: string
  /** How structured bullets are produced (deterministic) */
  structuredMethod: string
  /** How optional AI prose is produced when user runs Generate */
  aiMethod: string
  /** Free-API / panel bags used with counts */
  dataUsed: Array<{ field: string; count: number; usedIn: string }>
  /** Short free-source disclaimer */
  freeSourcesNote: string
  /** Scientific honesty caveats */
  caveats: string[]
  /** What AI is allowed to use if generated */
  aiInputDescription: string
}

export interface StructuredBrief {
  headline: string
  sections: BriefSection[]
  generatedAt: string
  provenance: BriefProvenance
  moleculeName: string
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
    sourceFields: [
      'chemblMechanisms',
      'chemblActivities',
      'pathwayNames',
      'geneDetails',
      'diseaseAssociations',
    ],
  })

  const regBullets: string[] = []
  if (companies > 0) regBullets.push(`${companies} approved product${companies > 1 ? 's' : ''}`)
  if (ndcProducts > 0) regBullets.push(`${ndcProducts} NDC codes`)
  if (orangeBook > 0) regBullets.push(`${orangeBook} Orange Book entries`)
  if (drugLabels > 0) regBullets.push(`${drugLabels} FDA drug labels`)
  if (rich.indicationDetails.length > 0) {
    const indParts = rich.indicationDetails
      .slice(0, 5)
      .map((i) => {
        const label = i.condition || i.meshHeading
        if (!label) return null
        if (i.maxPhase == null || i.maxPhase < 0 || Number.isNaN(i.maxPhase)) return label
        return `${label} (phase ${i.maxPhase})`
      })
      .filter((x): x is string => !!x)
    if (indParts.length > 0) regBullets.push(`Indications: ${indParts.join(', ')}`)
  }
  if (rich.atcClasses.length > 0) {
    const atcUnique = Array.from(new Set(rich.atcClasses.map((a) => a.trim()).filter(Boolean)))
    if (atcUnique.length > 0) regBullets.push(`ATC: ${atcUnique.join(', ')}`)
  }
  if (regBullets.length === 0) regBullets.push('No marketed products in FDA databases')
  sections.push({
    title: 'Regulatory Status',
    emoji: '📋',
    bullets: regBullets,
    sentiment: companies > 0 ? 'positive' : 'neutral',
    sourceFields: [
      'companies',
      'ndcProducts',
      'orangeBookEntries',
      'drugLabels',
      'chemblIndications',
      'atcClassifications',
    ],
  })

  if (trials > 0) {
    const clinBullets: string[] = []
    if (phaseStr) clinBullets.push(`${trials} trials (${phaseStr})`)
    else clinBullets.push(`${trials} clinical trials`)
    if (trialCondStr) clinBullets.push(`Conditions: ${trialCondStr}`)
    if (rich.trialDetails.length > 0) {
      clinBullets.push(
        `Key trials: ${rich.trialDetails
          .slice(0, 3)
          .map((t) => {
            const phase =
              !t.phase || t.phase === 'NA' || t.phase === 'N/A' || t.phase === 'Unknown'
                ? 'phase n/a'
                : t.phase
            const conds = t.conditions.filter(Boolean).join(', ') || 'unspecified'
            return `[${t.nctId}] ${phase} — ${conds}`
          })
          .join('; ')}`,
      )
    }
    sections.push({
      title: 'Clinical Pipeline',
      emoji: '🔬',
      bullets: clinBullets,
      sentiment: 'positive',
      sourceFields: ['clinicalTrials'],
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
      sourceFields: [
        'adverseEvents',
        'drugRecalls',
        'drugInteractions',
        'pharmacogenomicGenes',
        'siderSideEffects',
      ],
    })
  }

  if (literature > 0 || patents > 0 || nihGrants > 0) {
    const resBullets: string[] = []
    if (literature > 0) resBullets.push(`${literature} publications`)
    if (rich.publicationDetails.length > 0) {
      resBullets.push(
        `Recent: ${rich.publicationDetails
          .slice(0, 3)
          .map((p) => {
            const title = (p.title || 'Untitled').slice(0, 60)
            const meta = [p.journal, p.year > 0 ? String(p.year) : ''].filter(Boolean).join(', ')
            return meta ? `"${title}" (${meta})` : `"${title}"`
          })
          .join('; ')}`,
      )
    }
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
      sourceFields: ['literature', 'semanticPapers', 'openAlexWorks', 'patents', 'nihGrants'],
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
      sourceFields: ['uniprotEntries', 'pdbStructures', 'proteinDetails'],
    })
  }

  const fieldCatalog: Array<{ field: string; count: number; usedIn: string }> = [
    { field: 'companies', count: companies, usedIn: 'Regulatory Status' },
    { field: 'ndcProducts', count: ndcProducts, usedIn: 'Regulatory Status' },
    { field: 'orangeBookEntries', count: orangeBook, usedIn: 'Regulatory Status' },
    { field: 'drugLabels', count: drugLabels, usedIn: 'Regulatory Status' },
    { field: 'clinicalTrials', count: trials, usedIn: 'Clinical Pipeline' },
    { field: 'adverseEvents', count: adverseEvents, usedIn: 'Safety Profile' },
    { field: 'drugRecalls', count: recalls, usedIn: 'Safety Profile' },
    { field: 'drugInteractions', count: drugInteractions, usedIn: 'Safety Profile' },
    { field: 'literature/openAlex/semantic', count: literature, usedIn: 'Research Landscape' },
    { field: 'patents', count: patents, usedIn: 'Research Landscape' },
    { field: 'nihGrants', count: nihGrants, usedIn: 'Research Landscape' },
    { field: 'pdbStructures', count: pdbStructures, usedIn: 'Structural Biology' },
    { field: 'uniprotEntries', count: uniprotEntries, usedIn: 'Structural Biology' },
    {
      field: 'chemblMechanisms (rich)',
      count: rich.mechanismDetails.length,
      usedIn: 'Mechanism & Biology',
    },
    {
      field: 'chemblActivities (rich)',
      count: rich.topTargetActivities.length,
      usedIn: 'Mechanism & Biology',
    },
  ].filter((r) => r.count > 0)

  const provenance: BriefProvenance = {
    whyAvailable:
      `This brief is shown because free-public profile panels for ${moleculeName} already returned structured lists (trials, labels, AEs, literature, etc.). BioIntel summarizes only what is loaded in this browser session — empty panels contribute nothing.`,
    structuredMethod:
      'Deterministic rules in buildStructuredBrief: count array lengths, pick top N names/phases/reactions from extractRichData, assign sentiment from simple thresholds (e.g. recalls → warning). No LLM in this path. Headline is a template from company/trial/literature presence.',
    aiMethod:
      'Optional “Generate AI Brief” sends only the structured bullets (not raw multi-MB API JSON) to your connected Ollama model via /api/ai-brief. The model is instructed to synthesize mechanism, niche, risk, and a research next step without inventing counts. Temperature 0.3, capped tokens. Not of-record Discover ranking.',
    dataUsed: fieldCatalog,
    freeSourcesNote:
      'All underlying rows come from free public APIs already fetched for this molecule (openFDA, ClinicalTrials.gov, ChEMBL, PubChem ecosystem, Europe PMC / OpenAlex, PatentsView, NIH RePORTER, UniProt/PDB, etc.). No paid commercial DBs are required.',
    caveats: [
      'Not clinical, regulatory, or investment advice.',
      'Counts reflect what loaded successfully — timeouts/empty panels understate the real public record.',
      'AE “serious” totals are from retrieved FAERS-shaped rows, not a curated safety assessment.',
      'AI prose can mis-summarize; always open the cited panels for primary evidence.',
      'Of-record candidate ranking elsewhere remains deterministic free-API scores, not this brief.',
    ],
    aiInputDescription:
      'When AI runs, it receives only: molecule name + the structured section titles and bullet strings below (already derived from free-API counts and sample names). It does not receive full claim packs, board status, or private notes unless you paste them elsewhere.',
  }

  return {
    headline,
    sections,
    generatedAt: new Date().toISOString(),
    provenance,
    moleculeName,
  }
}

export function buildOllamaPrompt(brief: StructuredBrief, moleculeName: string): string {
  const bulletText = brief.sections
    .map(s => `${s.title}:\n${s.bullets.map(b => `  - ${b}`).join('\n')}`)
    .join('\n\n')

  const fields = brief.provenance.dataUsed
    .map((d) => `${d.field}=${d.count}`)
    .join(', ')

  return `You are a pharmaceutical research analyst helping a scientist understand free-public evidence already loaded in BioIntel. Given the following structured facts about the molecule "${moleculeName}", write a concise 3-4 sentence executive summary that provides genuine scientific insight.

Rules:
- Do NOT invent trials, targets, AEs, or approvals not listed below.
- Do NOT just repeat raw counts — synthesize mechanism, therapeutic niche, key risk, and one research next step.
- Connect mechanism to safety where the data supports it.
- Name specific targets, genes, and adverse events only if they appear in the data.
- This is research triage language only — not clinical or regulatory decision support.

Provenance of numbers (free public APIs, session-loaded): ${fields || 'see bullets'}

Data:
${bulletText}

Executive Summary:`
}

/** System message for transparency UI (pairs with buildOllamaPrompt). */
export function buildOllamaBriefSystemPrompt(): string {
  return [
    'You write short executive research briefs from structured free-public BioIntel facts only.',
    'Never invent evidence. Never claim regulatory approval beyond listed marketed products.',
    'Not clinical decision support. Prefer cautious language when safety data is sparse.',
  ].join(' ')
}
