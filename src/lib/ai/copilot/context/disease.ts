import type { DiseaseContext } from './types'
import { DEFAULT_MAX_CONTEXT_CHARS } from './types'

export function buildDiseaseContext(
  query: string,
  results: { id: string; name: string; description?: string; therapeuticAreas?: string[]; source: string; molecules?: { name: string; cid: number | null }[] }[],
): DiseaseContext {
  const sources = Array.from(new Set(results.map(r => r.source)))
  const resultsWithMolecules = results.filter(r => r.molecules && r.molecules.length > 0).length
  const totalMolecules = results.reduce((sum, r) => sum + (r.molecules?.length ?? 0), 0)

  return {
    query,
    results: results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      therapeuticAreas: r.therapeuticAreas,
      source: r.source,
      molecules: r.molecules,
    })),
    dataCompleteness: {
      sources,
      resultsWithMolecules,
      totalMolecules,
      totalResults: results.length,
    },
  }
}

export function diseaseContextToPromptBlock(ctx: DiseaseContext, maxChars: number = DEFAULT_MAX_CONTEXT_CHARS): string {
  const lines: string[] = []

  lines.push(`=== DISEASE SEARCH: "${ctx.query}" ===`)
  lines.push(`Results: ${ctx.dataCompleteness.totalResults} diseases from ${ctx.dataCompleteness.sources.join(', ')}`)
  lines.push(`Candidate molecules found: ${ctx.dataCompleteness.totalMolecules} across ${ctx.dataCompleteness.resultsWithMolecules} diseases`)
  lines.push('')

  for (const r of ctx.results) {
    lines.push(`## ${r.name} [${r.source}]`)
    if (r.description) lines.push(`  Definition: ${r.description.slice(0, 200)}`)
    if (r.therapeuticAreas && r.therapeuticAreas.length > 0) {
      lines.push(`  Therapeutic areas: ${r.therapeuticAreas.join(', ')}`)
    }
    if (r.molecules && r.molecules.length > 0) {
      lines.push(`  Candidate molecules:`)
      for (const m of r.molecules) {
        lines.push(m.cid
          ? `    - ${m.name} (CID ${m.cid}) — CLICKABLE`
          : `    - ${m.name} (no PubChem entry)`
        )
      }
    }
    lines.push('')
  }

  lines.push('// RESEARCHER GUIDANCE:')
  lines.push('- For diseases WITH candidate molecules: analyze MoA overlap, predict which molecules are most promising and WHY')
  lines.push('- For diseases WITHOUT candidate molecules: suggest target gene/protein names that could be queried as molecules')
  lines.push('- Cross-reference therapeutic areas to find unexpected drug repurposing opportunities')
  lines.push('- Identify diseases in results that share molecular targets — this indicates therapeutic proximity')

  const result = lines.join('\n')
  if (result.length <= maxChars) return result

  const headerEnd = result.indexOf('## ')
  if (headerEnd === -1) return result.slice(0, maxChars)
  const header = result.slice(0, headerEnd)
  const resultBlocks = result.slice(headerEnd).split('\n## ').map(b => '## ' + b)
  let trimmed = header
  for (const block of resultBlocks) {
    if (trimmed.length + block.length + 1 > maxChars) break
    trimmed += '\n' + block
  }
  trimmed += '\n[Context truncated — showing top disease results]'
  return trimmed
}
