export interface SummaryCard {
  id: string
  title: string
  icon: string
  accentColor: string
  categoryId: string
  primaryLabel: string
  primaryValue: number
  primaryPanelId?: string
  secondaryMetrics: { label: string; value: number | string; panelId?: string }[]
}

export interface MoleculeSummaryData {
  cards: SummaryCard[]
}

function safeArray(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : []
}

function buildPhaseBreakdown(trials: Record<string, unknown>[]): string {
  const counts: Record<string, number> = {}
  for (const t of trials) {
    const phase = String(t?.phase ?? '').toLowerCase()
    if (phase.includes('phase 1')) counts['P1'] = (counts['P1'] || 0) + 1
    if (phase.includes('phase 2')) counts['P2'] = (counts['P2'] || 0) + 1
    if (phase.includes('phase 3')) counts['P3'] = (counts['P3'] || 0) + 1
    if (phase.includes('phase 4')) counts['P4'] = (counts['P4'] || 0) + 1
  }
  const parts: string[] = []
  for (const key of ['P1', 'P2', 'P3', 'P4']) {
    if (counts[key] && counts[key] > 0) {
      parts.push(`${key}: ${counts[key]}`)
    }
  }
  return parts.join(' · ')
}

export function computeMoleculeSummary(
  props: Record<string, unknown>
): MoleculeSummaryData {
  const companies = safeArray(props.companies)
  const ndcProducts = safeArray(props.ndcProducts)
  const orangeBookEntries = safeArray(props.orangeBookEntries)
  const drugLabels = safeArray(props.drugLabels)

  const adverseEvents = safeArray(props.adverseEvents)
  const drugRecalls = safeArray(props.drugRecalls)

  const clinicalTrials = safeArray(props.clinicalTrials)
  const chemblIndications = safeArray(props.chemblIndications)

  const literature = safeArray(props.literature)
  const semanticPapers = safeArray(props.semanticPapers)
  const openAlexWorks = safeArray(props.openAlexWorks)
  const nihGrants = safeArray(props.nihGrants)
  const patents = safeArray(props.patents)
  const citationMetrics = safeArray(props.citationMetrics)

  const chemblActivities = safeArray(props.chemblActivities)
  const chemblMechanisms = safeArray(props.chemblMechanisms)
  const reactomePathways = safeArray(props.reactomePathways)
  const wikiPathways = safeArray(props.wikiPathways)
  const pathwayCommonsResults = safeArray(props.pathwayCommonsResults)
  const drugGeneInteractions = safeArray(props.drugGeneInteractions)

  const uniprotEntries = safeArray(props.uniprotEntries)
  const pdbStructures = safeArray(props.pdbStructures)
  const alphaFoldPredictions = safeArray(props.alphaFoldPredictions)
  const proteinDomains = safeArray(props.proteinDomains)

  // Card 2: sum serious
  const seriousCount = adverseEvents.reduce(
    (sum: number, e: Record<string, unknown>) => sum + (Number(e?.serious) || 0),
    0
  )

  // Card 4: rough dedup publications
  const pubCount = Math.max(
    literature.length,
    semanticPapers.length,
    openAlexWorks.length
  )

  // Card 4: total citations
  const totalCitations = citationMetrics.reduce(
    (sum: number, c: Record<string, unknown>) => sum + (Number(c?.citationCount) || 0),
    0
  )

  // Card 5: unique targets
  const uniqueTargets = new Set(
    chemblActivities
      .map((a: Record<string, unknown>) => a?.targetName)
      .filter((n: unknown) => n != null)
  )

  // Card 5: pathways total
  const totalPathways =
    reactomePathways.length +
    wikiPathways.length +
    pathwayCommonsResults.length

  const cards: SummaryCard[] = [
    {
      id: 'approval',
      title: 'Approval & Products',
      icon: '✅',
      accentColor: 'border-t-emerald-500',
      categoryId: 'pharmaceutical',
      primaryLabel: 'Approved Products',
      primaryValue: companies.length,
      primaryPanelId: 'companies',
      secondaryMetrics: [
        { label: 'NDC Codes', value: ndcProducts.length, panelId: 'ndc' },
        { label: 'Orange Book', value: orangeBookEntries.length, panelId: 'orange-book' },
        { label: 'Drug Labels', value: drugLabels.length, panelId: 'dailymed' },
      ],
    },
    {
      id: 'safety',
      title: 'Safety Signals',
      icon: '⚠️',
      accentColor: 'border-t-red-500',
      categoryId: 'clinical-safety',
      primaryLabel: 'Adverse Events',
      primaryValue: adverseEvents.length,
      primaryPanelId: 'adverse-events',
      secondaryMetrics: [
        { label: 'Serious Events', value: seriousCount, panelId: 'adverse-events' },
        { label: 'Recalls', value: drugRecalls.length, panelId: 'recalls' },
      ],
    },
    {
      id: 'clinical',
      title: 'Clinical Pipeline',
      icon: '🔬',
      accentColor: 'border-t-blue-500',
      categoryId: 'clinical-safety',
      primaryLabel: 'Active Trials',
      primaryValue: clinicalTrials.length,
      primaryPanelId: 'clinical-trials',
      secondaryMetrics: [
        { label: 'Phases', value: buildPhaseBreakdown(clinicalTrials), panelId: 'clinical-trials' },
        { label: 'Indications', value: chemblIndications.length, panelId: 'chembl-indications' },
      ],
    },
    {
      id: 'research',
      title: 'Research Activity',
      icon: '📊',
      accentColor: 'border-t-amber-500',
      categoryId: 'research-literature',
      primaryLabel: 'Publications',
      primaryValue: pubCount,
      primaryPanelId: 'literature',
      secondaryMetrics: [
        { label: 'NIH Grants', value: nihGrants.length, panelId: 'nih-reporter' },
        { label: 'Patents', value: patents.length, panelId: 'patents' },
        { label: 'Total Citations', value: totalCitations, panelId: 'open-citations' },
      ],
    },
    {
      id: 'biological',
      title: 'Biological Profile',
      icon: '🎯',
      accentColor: 'border-t-violet-500',
      categoryId: 'bioactivity-targets',
      primaryLabel: 'Known Targets',
      primaryValue: uniqueTargets.size,
      primaryPanelId: 'chembl',
      secondaryMetrics: [
        { label: 'Mechanisms', value: chemblMechanisms.length, panelId: 'chembl-mechanisms' },
        { label: 'Pathways', value: totalPathways, panelId: 'reactome' },
        { label: 'Drug-Gene', value: drugGeneInteractions.length, panelId: 'dgidb' },
      ],
    },
    {
      id: 'structural',
      title: 'Structural Data',
      icon: '🧬',
      accentColor: 'border-t-cyan-500',
      categoryId: 'protein-structure',
      primaryLabel: 'Protein Targets',
      primaryValue: uniprotEntries.length,
      primaryPanelId: 'uniprot',
      secondaryMetrics: [
        { label: '3D Structures', value: pdbStructures.length, panelId: 'pdb' },
        { label: 'AlphaFold', value: alphaFoldPredictions.length, panelId: 'alphafold' },
        { label: 'Domains', value: proteinDomains.length, panelId: 'interpro' },
      ],
    },
  ]

  return { cards }
}
