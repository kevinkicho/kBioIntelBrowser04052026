export interface ExportSection {
  category: string
  panels: { title: string; data: Record<string, unknown>[] | Record<string, unknown> | null }[]
}

interface PanelMapping {
  propKey: string
  title: string
}

const categoryMappings: { category: string; panels: PanelMapping[] }[] = [
  {
    category: 'Pharmaceutical',
    panels: [
      { propKey: 'companies', title: 'Companies' },
      { propKey: 'ndcProducts', title: 'NDC Products' },
      { propKey: 'orangeBookEntries', title: 'Orange Book' },
      { propKey: 'drugPrices', title: 'Drug Pricing' },
      { propKey: 'drugInteractions', title: 'Drug Interactions' },
      { propKey: 'drugLabels', title: 'Drug Labels' },
      { propKey: 'atcClassifications', title: 'ATC Classification' },
    ],
  },
  {
    category: 'Clinical & Safety',
    panels: [
      { propKey: 'clinicalTrials', title: 'Clinical Trials' },
      { propKey: 'adverseEvents', title: 'Adverse Events' },
      { propKey: 'drugRecalls', title: 'Recalls' },
      { propKey: 'chemblIndications', title: 'Indications' },
      { propKey: 'clinVarVariants', title: 'ClinVar' },
      { propKey: 'gwasAssociations', title: 'GWAS' },
    ],
  },
  {
    category: 'Molecular & Chemical',
    panels: [
      { propKey: 'computedProperties', title: 'Computed Properties' },
      { propKey: 'ghsHazards', title: 'GHS Hazards' },
      { propKey: 'chebiAnnotation', title: 'ChEBI' },
      { propKey: 'compToxData', title: 'CompTox' },
      { propKey: 'routes', title: 'Synthesis Routes' },
    ],
  },
  {
    category: 'Bioactivity & Targets',
    panels: [
      { propKey: 'chemblActivities', title: 'ChEMBL Bioactivity' },
      { propKey: 'bioAssays', title: 'BioAssay' },
      { propKey: 'chemblMechanisms', title: 'Mechanisms of Action' },
      { propKey: 'pharmacologyTargets', title: 'IUPHAR Targets' },
      { propKey: 'bindingAffinities', title: 'Binding Affinities' },
      { propKey: 'pharosTargets', title: 'Pharos Targets' },
      { propKey: 'drugGeneInteractions', title: 'Drug-Gene Interactions' },
      { propKey: 'diseaseAssociations', title: 'Disease Associations' },
    ],
  },
  {
    category: 'Protein & Structure',
    panels: [
      { propKey: 'uniprotEntries', title: 'UniProt Proteins' },
      { propKey: 'proteinDomains', title: 'InterPro Domains' },
      { propKey: 'proteinFeatures', title: 'Protein Features' },
      { propKey: 'proteinAtlasEntries', title: 'Protein Atlas' },
      { propKey: 'goAnnotations', title: 'Gene Ontology' },
      { propKey: 'pdbStructures', title: 'PDB Structures' },
      { propKey: 'pdbeLigands', title: 'PDBe Ligands' },
      { propKey: 'alphaFoldPredictions', title: 'AlphaFold' },
    ],
  },
  {
    category: 'Genomics & Disease',
    panels: [
      { propKey: 'geneInfo', title: 'Gene Info' },
      { propKey: 'ensemblGenes', title: 'Ensembl' },
      { propKey: 'geneExpressions', title: 'Expression Atlas' },
      { propKey: 'monarchDiseases', title: 'Monarch Disease' },
      { propKey: 'nciConcepts', title: 'NCI Thesaurus' },
      { propKey: 'meshTerms', title: 'MeSH Terms' },
    ],
  },
  {
    category: 'Interactions & Pathways',
    panels: [
      { propKey: 'proteinInteractions', title: 'STRING' },
      { propKey: 'chemicalProteinInteractions', title: 'STITCH' },
      { propKey: 'molecularInteractions', title: 'IntAct' },
      { propKey: 'reactomePathways', title: 'Reactome' },
      { propKey: 'wikiPathways', title: 'WikiPathways' },
      { propKey: 'pathwayCommonsResults', title: 'Pathway Commons' },
    ],
  },
  {
    category: 'Research & Literature',
    panels: [
      { propKey: 'nihGrants', title: 'NIH Grants' },
      { propKey: 'patents', title: 'Patents' },
      { propKey: 'secFilings', title: 'SEC Filings' },
      { propKey: 'literature', title: 'Literature' },
      { propKey: 'semanticPapers', title: 'Semantic Scholar' },
      { propKey: 'openAlexWorks', title: 'OpenAlex' },
      { propKey: 'citationMetrics', title: 'OpenCitations' },
    ],
  },
]

export function buildExportSections(props: Record<string, unknown>): ExportSection[] {
  return categoryMappings.map(({ category, panels: panelDefs }) => {
    const panels = panelDefs
      .map(({ propKey, title }) => {
        const raw = props[propKey]
        if (raw === null || raw === undefined) return null

        let data: Record<string, unknown>[]
        if (Array.isArray(raw)) {
          data = raw as Record<string, unknown>[]
        } else if (typeof raw === 'object') {
          data = [raw as Record<string, unknown>]
        } else {
          return null
        }

        if (data.length === 0) return null

        return { title, data }
      })
      .filter((p): p is { title: string; data: Record<string, unknown>[] } => p !== null)

    return { category, panels }
  })
}

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCsv(sections: ExportSection[]): string {
  const lines: string[] = []

  for (const section of sections) {
    if (section.panels.length === 0) continue

    lines.push(`## ${section.category}`)

    for (const panel of section.panels) {
      const dataArr = Array.isArray(panel.data) ? panel.data : []
      if (dataArr.length === 0) continue

      lines.push(`### ${panel.title}`)

      const keys = Array.from(
        new Set(dataArr.flatMap(item => Object.keys(item as Record<string, unknown>)))
      )
      lines.push(keys.join(','))

      for (const item of dataArr) {
        const row = keys.map(k => escapeValue((item as Record<string, unknown>)[k]))
        lines.push(row.join(','))
      }

      lines.push('')
    }
  }

  return lines.join('\n')
}

export function exportToJson(sections: ExportSection[]): string {
  return JSON.stringify(sections, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof document === 'undefined') return

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
