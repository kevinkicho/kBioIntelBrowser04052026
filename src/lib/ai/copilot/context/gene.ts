import type { GeneContext } from './types'
import { DEFAULT_MAX_CONTEXT_CHARS } from './types'
import { safeArr, safeStr } from './helpers'

export function buildGeneContext(
  geneSymbol: string,
  geneData: Record<string, unknown>,
  snapshot: { totalApisSucceeded: number; totalApisCalled: number; gaps: { panelKey: string; reason: string }[] },
): GeneContext {
  const overview = (geneData.geneOverview ?? {}) as Record<string, unknown>
  const drugs = safeArr(geneData.geneDrugs) as { drugName?: string; interactionType?: string; sources?: string[] }[]
  const diseases = safeArr((geneData.geneDiseases as Record<string, unknown>)?.disgenetAssociations) as { diseaseName?: string; score?: number; source?: string }[]
  const variants = safeArr((geneData.geneVariants as Record<string, unknown>)?.clinvarVariants) as { clinicalSignificance?: string; geneSymbol?: string; conditionName?: string }[]
  const pathways = [
    ...safeArr((geneData.genePathways as Record<string, unknown>)?.reactomePathways).map((p: Record<string, unknown>) => safeStr(p?.name)),
    ...safeArr((geneData.genePathways as Record<string, unknown>)?.wikiPathways).map((p: Record<string, unknown>) => safeStr(p?.name)),
  ]
  const goAnnotations = (overview?.goAnnotations ?? {}) as { biologicalProcess?: string[]; molecularFunction?: string[]; cellularComponent?: string[] }
  const goTerms = [
    ...(goAnnotations.biologicalProcess ?? []),
    ...(goAnnotations.molecularFunction ?? []),
    ...(goAnnotations.cellularComponent ?? []),
  ]

  return {
    symbol: safeStr(overview?.symbol) || geneSymbol,
    name: safeStr(overview?.name),
    summary: safeStr(overview?.summary).slice(0, 500),
    chromosome: safeStr(overview?.chromosome),
    typeOfGene: safeStr(overview?.typeOfGene),
    aliases: Array.isArray(overview?.aliases) ? (overview.aliases as string[]).slice(0, 10) : [],
    ensemblId: safeStr(overview?.ensemblId),
    uniprotId: safeStr(overview?.uniprotId),
    targetedDrugs: drugs.slice(0, 20).map(d => ({
      drugName: safeStr(d.drugName),
      interactionType: safeStr(d.interactionType),
      sources: Array.isArray(d.sources) ? d.sources.map(String) : [],
    })),
    diseaseAssociations: diseases.slice(0, 20).map(d => ({
      diseaseName: safeStr(d.diseaseName),
      score: Number(d.score) || 0,
      source: safeStr(d.source),
    })),
    clinvarVariants: variants.slice(0, 15).map(v => ({
      clinicalSignificance: safeStr(v.clinicalSignificance),
      geneSymbol: safeStr(v.geneSymbol),
      conditionName: safeStr(v.conditionName),
    })),
    pathwayNames: pathways.slice(0, 10),
    goTerms: goTerms.slice(0, 15),
    dataCompleteness: {
      panelsLoaded: snapshot.totalApisSucceeded,
      totalPanels: snapshot.totalApisCalled,
      gapList: snapshot.gaps.map(g => `${g.panelKey} (${g.reason})`),
    },
  }
}

export function geneContextToPromptBlock(ctx: GeneContext, maxChars: number = DEFAULT_MAX_CONTEXT_CHARS): string {
  const lines: string[] = []

  lines.push(`=== ${ctx.symbol} (${ctx.name}) ===`)
  if (ctx.summary) lines.push(`Summary: ${ctx.summary}`)
  if (ctx.chromosome) lines.push(`Location: chr ${ctx.chromosome}`)
  if (ctx.typeOfGene) lines.push(`Type: ${ctx.typeOfGene}`)
  if (ctx.ensemblId) lines.push(`Ensembl: ${ctx.ensemblId}`)
  if (ctx.uniprotId) lines.push(`UniProt: ${ctx.uniprotId}`)
  if (ctx.aliases.length > 0) lines.push(`Aliases: ${ctx.aliases.join(', ')}`)

  if (ctx.targetedDrugs.length > 0) {
    lines.push(`\n// DRUGS TARGETING THIS GENE (${ctx.targetedDrugs.length} found):`)
    for (const d of ctx.targetedDrugs) {
      lines.push(`  - ${d.drugName}${d.interactionType ? ` [${d.interactionType}]` : ''}${d.sources.length > 0 ? ` (sources: ${d.sources.slice(0, 3).join(', ')})` : ''}`)
    }
  }

  if (ctx.diseaseAssociations.length > 0) {
    lines.push(`\n// DISEASE ASSOCIATIONS (gene→disease links):`)
    for (const d of ctx.diseaseAssociations) {
      lines.push(`  - ${d.diseaseName} (score=${d.score.toFixed(2)}, source=${d.source})`)
    }
  }

  if (ctx.clinvarVariants.length > 0) {
    lines.push(`\n// CLINICAL VARIANTS:`)
    for (const v of ctx.clinvarVariants) {
      lines.push(`  - ${v.clinicalSignificance}${v.conditionName ? ` (${v.conditionName})` : ''}`)
    }
  }

  if (ctx.pathwayNames.length > 0) {
    lines.push(`\n// PATHWAYS: ${ctx.pathwayNames.join('; ')}`)
  }
  if (ctx.goTerms.length > 0) {
    lines.push(`// GENE ONTOLOGY: ${ctx.goTerms.join(', ')}`)
  }

  lines.push(`\n// DATA COMPLETENESS: ${ctx.dataCompleteness.panelsLoaded}/${ctx.dataCompleteness.totalPanels} panels loaded`)
  if (ctx.dataCompleteness.gapList.length > 0) {
    lines.push(`Missing: ${ctx.dataCompleteness.gapList.slice(0, 6).join(', ')}`)
  }

  const result = lines.join('\n')
  if (result.length <= maxChars) return result
  return result.slice(0, maxChars) + '\n[Context truncated]'
}
