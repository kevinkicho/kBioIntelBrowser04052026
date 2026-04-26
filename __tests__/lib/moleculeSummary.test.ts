import { computeMoleculeSummary, MoleculeSummaryData, SummaryCard } from '@/lib/moleculeSummary'

describe('computeMoleculeSummary', () => {
  const fullProps: Record<string, unknown> = {
    companies: [{ name: 'Pfizer' }, { name: 'Novartis' }],
    ndcProducts: [{ id: 1 }, { id: 2 }, { id: 3 }],
    orangeBookEntries: [{ id: 1 }],
    drugLabels: [{ id: 1 }, { id: 2 }],
    adverseEvents: [
      { serious: 1 },
      { serious: 0 },
      { serious: 1 },
      { serious: 1 },
    ],
    drugRecalls: [{ id: 1 }, { id: 2 }],
    clinicalTrials: [
      { phase: 'Phase 1' },
      { phase: 'Phase 2' },
      { phase: 'Phase 2' },
      { phase: 'Phase 3' },
      { phase: 'phase 1' },
    ],
    chemblIndications: [{ id: 1 }, { id: 2 }],
    literature: [{ id: 1 }, { id: 2 }],
    semanticPapers: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    openAlexWorks: [{ id: 1 }, { id: 2 }, { id: 3 }],
    nihGrants: [{ id: 1 }],
    patents: [{ id: 1 }, { id: 2 }, { id: 3 }],
    citationMetrics: [
      { citationCount: 100 },
      { citationCount: 250 },
      { citationCount: 50 },
    ],
    chemblActivities: [
      { targetName: 'COX-2' },
      { targetName: 'COX-1' },
      { targetName: 'COX-2' },
      { targetName: 'EGFR' },
    ],
    chemblMechanisms: [{ id: 1 }, { id: 2 }],
    reactomePathways: [{ id: 1 }],
    wikiPathways: [{ id: 1 }, { id: 2 }],
    pathwayCommonsResults: [{ id: 1 }],
    drugGeneInteractions: [{ id: 1 }, { id: 2 }, { id: 3 }],
    uniprotEntries: [{ id: 1 }, { id: 2 }],
    pdbStructures: [{ id: 1 }, { id: 2 }, { id: 3 }],
    alphaFoldPredictions: [{ id: 1 }],
    proteinDomains: [{ id: 1 }, { id: 2 }],
  }

  it('returns 6 cards with correct ids', () => {
    const result = computeMoleculeSummary(fullProps)
    expect(result.cards).toHaveLength(6)
    expect(result.cards.map((c) => c.id)).toEqual([
      'approval',
      'safety',
      'clinical',
      'research',
      'biological',
      'structural',
    ])
  })

  it('Card 1: counts companies/NDC/OrangeBook/labels correctly', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[0]
    expect(card.id).toBe('approval')
    expect(card.primaryValue).toBe(2) // companies.length
    expect(card.secondaryMetrics).toEqual([
      { label: 'NDC Codes', value: 3, panelId: 'ndc' },
      { label: 'Orange Book', value: 1, panelId: 'orange-book' },
      { label: 'Drug Labels', value: 2, panelId: 'dailymed' },
    ])
  })

  it('Card 2: sums serious adverse events', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[1]
    expect(card.id).toBe('safety')
    expect(card.primaryValue).toBe(4) // adverseEvents.length
    expect(card.secondaryMetrics).toEqual([
      { label: 'Serious Events', value: 3, panelId: 'adverse-events' },
      { label: 'Recalls', value: 2, panelId: 'recalls' },
    ])
  })

  it('Card 3: breaks down trial phases', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[2]
    expect(card.id).toBe('clinical')
    expect(card.primaryValue).toBe(5) // clinicalTrials.length
    expect(card.secondaryMetrics[0]).toEqual({
      label: 'Phases',
      value: 'P1: 2 · P2: 2 · P3: 1',
      panelId: 'clinical-trials',
    })
    expect(card.secondaryMetrics[1]).toEqual({
      label: 'Indications',
      value: 2,
      panelId: 'chembl-indications',
    })
  })

  it('Card 4: takes max of literature sources for dedup', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[3]
    expect(card.id).toBe('research')
    expect(card.primaryValue).toBe(5) // max(2, 5, 3)
    expect(card.secondaryMetrics).toEqual([
      { label: 'NIH Grants', value: 1, panelId: 'nih-reporter' },
      { label: 'Patents', value: 3, panelId: 'patents' },
      { label: 'Total Citations', value: 400, panelId: 'open-citations' },
    ])
  })

  it('Card 5: counts unique targets', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[4]
    expect(card.id).toBe('biological')
    expect(card.primaryValue).toBe(3) // COX-2, COX-1, EGFR
    expect(card.secondaryMetrics).toEqual([
      { label: 'Mechanisms', value: 2, panelId: 'chembl-mechanisms' },
      { label: 'Pathways', value: 4, panelId: 'reactome' }, // 1 + 2 + 1
      { label: 'Drug-Gene', value: 3, panelId: 'dgidb' },
    ])
  })

  it('Card 6: counts structural data', () => {
    const result = computeMoleculeSummary(fullProps)
    const card = result.cards[5]
    expect(card.id).toBe('structural')
    expect(card.primaryValue).toBe(2) // uniprotEntries.length
    expect(card.secondaryMetrics).toEqual([
      { label: '3D Structures', value: 3, panelId: 'pdb' },
      { label: 'AlphaFold', value: 1, panelId: 'alphafold' },
      { label: 'Domains', value: 2, panelId: 'interpro' },
    ])
  })

  it('handles empty/missing props gracefully (all zeros)', () => {
    const result = computeMoleculeSummary({})
    expect(result.cards).toHaveLength(6)
    for (const card of result.cards) {
      expect(card.primaryValue).toBe(0)
      for (const metric of card.secondaryMetrics) {
        // Phase breakdown returns empty string when no trials
        if (typeof metric.value === 'number') {
          expect(metric.value).toBe(0)
        }
      }
    }
  })
})
