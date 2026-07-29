import type { BgeeExpression } from '@/lib/types'

/** Which optional Bgee fields are populated in this session sample. */
export function bgeeColumnFlags(rows: readonly BgeeExpression[]): {
  hasStage: boolean
  hasScore: boolean
  hasOntology: boolean
  hasConfidence: boolean
  presenceOnly: boolean
} {
  const list = Array.isArray(rows) ? rows : []
  const hasStage = list.some((r) => Boolean(r.developmentalStageName?.trim()))
  const hasScore = list.some(
    (r) => typeof r.expressionScore === 'number' && Number.isFinite(r.expressionScore) && r.expressionScore > 0,
  )
  const hasOntology = list.some((r) => Boolean(r.anatomicalEntityId?.trim()))
  const hasConfidence = list.some(
    (r) => typeof r.confidenceScore === 'number' && Number.isFinite(r.confidenceScore) && r.confidenceScore > 0,
  )
  return {
    hasStage,
    hasScore,
    hasOntology,
    hasConfidence,
    presenceOnly: list.length > 0 && !hasStage && !hasScore,
  }
}

/**
 * CSS grid template for Bgee table columns.
 * Always: Anatomy · Presence · Open; optional Ontology · Stage · Score.
 */
export function bgeeGridClass(flags: ReturnType<typeof bgeeColumnFlags>): string {
  const cols = ['minmax(0,1.4fr)']
  if (flags.hasOntology) cols.push('minmax(5.5rem,0.75fr)')
  if (flags.hasStage) cols.push('minmax(0,1fr)')
  cols.push('minmax(4.5rem,0.55fr)') // presence
  if (flags.hasScore) cols.push('minmax(3.5rem,0.45fr)')
  cols.push('2.5rem') // open
  return `grid grid-cols-[${cols.join('_')}] gap-x-2`.replace(/_/g, '_')
}

/** Tailwind-safe fixed grids (dynamic template strings break purge). */
export function bgeeGridTemplate(flags: ReturnType<typeof bgeeColumnFlags>): string {
  // Encode combinations used in practice
  if (flags.hasOntology && flags.hasStage && flags.hasScore) {
    return 'grid grid-cols-[minmax(0,1.1fr)_minmax(5.5rem,0.7fr)_minmax(0,0.9fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.4fr)_2.5rem] gap-x-2'
  }
  if (flags.hasOntology && flags.hasScore && !flags.hasStage) {
    return 'grid grid-cols-[minmax(0,1.3fr)_minmax(5.5rem,0.75fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.45fr)_2.5rem] gap-x-2'
  }
  if (flags.hasOntology && flags.hasStage && !flags.hasScore) {
    return 'grid grid-cols-[minmax(0,1.2fr)_minmax(5.5rem,0.7fr)_minmax(0,1fr)_minmax(4.5rem,0.55fr)_2.5rem] gap-x-2'
  }
  if (flags.hasOntology && !flags.hasStage && !flags.hasScore) {
    // Presence-only (common isExpressedIn path): Anatomy · Ontology · Presence · Open
    return 'grid grid-cols-[minmax(0,1.5fr)_minmax(5.5rem,0.8fr)_minmax(5rem,0.6fr)_2.5rem] gap-x-2'
  }
  if (!flags.hasOntology && flags.hasScore) {
    return 'grid grid-cols-[minmax(0,1.5fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.45fr)_2.5rem] gap-x-2'
  }
  // Anatomy · Presence · Open
  return 'grid grid-cols-[minmax(0,1.6fr)_minmax(5rem,0.6fr)_2.5rem] gap-x-2'
}

export function bgeeSubtitle(flags: ReturnType<typeof bgeeColumnFlags>, count: number): string {
  if (count === 0) return 'No Bgee expression rows for this gene.'
  if (flags.presenceOnly) {
    return `${count} anatomy presence calls from Bgee (isExpressedIn). Stage and expression scores were not returned for this sample — Open opens the Bgee gene page.`
  }
  const bits = ['Anatomy']
  if (flags.hasOntology) bits.push('ontology id')
  if (flags.hasStage) bits.push('developmental stage')
  bits.push('presence')
  if (flags.hasScore) bits.push('expression score')
  return bits.join(', ') + '.'
}
